import { spawn, execSync, SpawnOptions } from "child_process"; // Added execSync
import path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

interface TestResult {
	suite: string;
	passed: boolean;
	exitCode: number | null;
	stdout?: string; // Optional stdout for TAP mode
	stderr?: string; // Optional stderr for TAP mode
}

// Function to run a command and capture its output/exit code
async function runCommand(
	command: string,
	args: string[],
	cwd: string = process.cwd(),
	suiteName: string,
	isTapOutputMode: boolean
): Promise<TestResult> {
	console.log(
		`\nRunning ${suiteName} tests: ${command} ${args.join(" ")} in ${cwd}`
	);

	return new Promise((resolve) => {
		const options: SpawnOptions = {
			stdio: isTapOutputMode ? "pipe" : "inherit", // Pipe output only in TAP mode
			shell: true, // Use shell to handle commands like 'poetry run'
			cwd: path.resolve(cwd), // Ensure the correct working directory
		};

		const childProcess = spawn(command, args, options);

		let stdoutData = "";
		let stderrData = "";

		if (isTapOutputMode) {
			childProcess.stdout?.on("data", (data) => {
				stdoutData += data.toString();
			});
			childProcess.stderr?.on("data", (data) => {
				stderrData += data.toString();
			});
		}

		childProcess.on("error", (error) => {
			console.error(`Error executing ${suiteName} tests:`, error);
			// Removed specific hint for Python TAP issue as it's checked upfront now
			resolve({
				suite: suiteName,
				passed: false,
				exitCode: 1,
				stdout: stdoutData,
				stderr: stderrData,
			}); // Treat execution errors as failures
		});

		childProcess.on("close", (code) => {
			const passed = code === 0;
			if (!isTapOutputMode) {
				// Only log pass/fail status in non-TAP mode here
				console.log(
					`${suiteName} tests ${passed ? "passed" : "failed"} with exit code ${code}.`
				);
			} else {
				// In TAP mode, stderr might contain useful info even on success (e.g., warnings)
				// or failure details not in TAP format. Let's print stderr if it exists.
				if (stderrData) {
					console.error(`\n--- ${suiteName} stderr ---\n${stderrData}\n--- End ${suiteName} stderr ---`);
				}
			}
			resolve({
				suite: suiteName,
				passed,
				exitCode: code,
				stdout: stdoutData,
				stderr: stderrData,
			});
		});
	});
}

// Main function to run all test suites
async function runAllTests() {
	const argv = await yargs(hideBin(process.argv))
		.option("tap", {
			alias: "t",
			type: "boolean",
			description: "Output raw TAP stream instead of formatted summary",
			default: false,
		})
		.help()
		.alias("help", "h").argv;

	const isTapOutputMode = process.env.CI === "true" || argv.tap;

	if (!isTapOutputMode) {
		console.log("Starting all test suites (human-readable output)...");
	} else {
		console.log("Starting all test suites (TAP output mode)...");
		// TAP requires version line first
		console.log("TAP version 13");
	}

	   // --- Python Dependency Check ---
	   try {
	       // Check if pytest-tap is installed via poetry
	       execSync("poetry run pip show pytest-tap", { stdio: "ignore" });
	   } catch (error) {
	       console.error("\n❌ Error: 'pytest-tap' not found in the Python environment.");
	       console.error("   Please run 'poetry install' in your terminal to install dependencies.");
	       process.exit(1); // Exit with error code
	   }
	   // --- End Python Dependency Check ---


	// Define test commands and arguments conditionally
	const pythonTestCommand = "poetry";
	const pythonTestArgs = ["run", "pytest"];
	if (isTapOutputMode) {
		pythonTestArgs.push("--tap-stream");
	}

	const nodeTestCommand = "yarn"; // Or "npm" or "pnpm" depending on your setup
	const nodeTestArgs = ["vitest", "run"];
	if (isTapOutputMode) {
		nodeTestArgs.push("--reporter=tap");
	}


	// Run tests sequentially
	const pythonResult = await runCommand(
		pythonTestCommand,
		pythonTestArgs,
		process.cwd(),
		"Python",
		isTapOutputMode
	);

	const nodeResult = await runCommand(
		nodeTestCommand,
		nodeTestArgs,
		process.cwd(),
		"Node.js",
		isTapOutputMode
	);

	// Determine overall exit code
	const overallPassed = pythonResult.passed && nodeResult.passed;
	const exitCode = overallPassed ? 0 : 1;

	if (isTapOutputMode) {
		// Print captured TAP stdout sequentially
		if (pythonResult.stdout) {
			process.stdout.write(pythonResult.stdout);
		}
		if (nodeResult.stdout) {
			process.stdout.write(nodeResult.stdout);
		}
		// TAP summary line (optional but good practice)
		// Count total tests from TAP output (simple line count for now)
		const pythonTests = pythonResult.stdout?.split('\n').filter(line => line.match(/^ok|^not ok/)).length || 0;
		const nodeTests = nodeResult.stdout?.split('\n').filter(line => line.match(/^ok|^not ok/)).length || 0;
		console.log(`1..${pythonTests + nodeTests}`);
	} else {
		// Summarize results for human-readable output
		console.log("\n--- Test Summary ---");
		console.log(
			`Python Tests: ${pythonResult.passed ? "✅ Passed" : "❌ Failed"} (Exit Code: ${pythonResult.exitCode})`
		);
		console.log(
			`Node.js Tests: ${nodeResult.passed ? "✅ Passed" : "❌ Failed"} (Exit Code: ${nodeResult.exitCode})`
		);
		console.log("--------------------");
		console.log(
			`\nOverall status: ${overallPassed ? "All tests passed!" : "Some tests failed."}`
		);
		      // Reminder about dependencies
		      console.log("\nReminder: Ensure dependencies are installed with 'poetry install' and 'yarn install'.");
	}


	process.exit(exitCode);
}

// Execute the main function
runAllTests().catch((error) => {
	console.error("An unexpected error occurred during test execution:", error);
	process.exit(1);
});
