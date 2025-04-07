import * as fs from "fs";
import * as path from "path";

export function loadFixture<T>(fixtureName: string): T {
	const fixturePath = path.join(__dirname, "fixtures", `${fixtureName}.json`);

	try {
		const fileContent = fs.readFileSync(fixturePath, "utf-8");
		return JSON.parse(fileContent) as T;
	} catch (error) {
		console.error(
			`Error loading fixture '${fixtureName}' from ${fixturePath}:`,
			error
		);
		throw error;
	}
}
