import { db } from "../libs/db.js"

import {
    getLanguageName,
    pollBatchResults,
    submitBatch,
} from "../libs/judge0.lib.js"

import { ApiResponse } from "../libs/apiResponse.js"
import { ApiError } from "../libs/apiError.js"


export const executeCode = async (req, res) => {
    try {
        // Get source_code, language_id, stdin, expected_outputs, problemId from req.body
        const { source_code, language_id, stdin, expected_outputs, problemId } = req.body

        // get userId from req.user
        const userId = req.user.id

        // Validate test cases

        if (
            !Array.isArray(stdin) || stdin.length === 0 || !Array.isArray(expected_outputs) || expected_outputs.length !== stdin.length
        ) {
            throw new ApiError(400, "Invalid or Missing test cases")
        }

        // Prepare each test case for judge0 batch submission
        const submissions = stdin.map((input) => ({
            source_code,
            language_id,
            stdin: input,
        }))

        // Send batch of submissions to judge0
        const submitResponse = await submitBatch(submissions)

        // Poll judge0 for results of all submitted test cases
        const results = await pollBatchResults(tokens)

        console.log("Result -------------------");
        console.log(results);

        // Analyze test case results
        let allPassed = true
        const detailedResults = results.map((result, i) => {
            const stdout = result.stdout?.trim()
            const expected_output = expected_outputs[i]?.trim()
            const passed = stdout === expected_output

            if (!passed) allPassed = false

            return {
                testCase: i + 1,
                passed,
                stdout,
                expected: expected_output,
                stderr: result.stderr || null,
                compile_output: result.compile_output || null,
                status: result.status.description,
                memory: result.memory ? `${result.memory} KB` : undefined,
                time: result.time ? `${result.time} s` : undefined
            }

            // console.log(`Testcase #${i+1}`);
            // console.log(`Input for testcase #${i+1}: ${stdin[i]}`)
            // console.log(`Expected Output for testcase #${i+1}: ${expected_output}`)
            // console.log(`Actual output for testcase #${i+1}: ${stdout}`)

            // console.log(`Matched testcase #${i+1}: ${passed}`)
        })

        console.log(detailedResults)

        // Store submission summary
        const submission = await db.submission.create({
            data: {
                userId,
                problemId,
                sourceCode: source_code,
                language: getLanguageName(language_id),
                stdin: stdin.join("\n"),
                stdout: JSON.stringify(detailedResults.map((r) => r.stdout)),
                stderr: detailedResults.some((r) => r.stderr) ? JSON.stringify(detailedResults.map((r) => r.stderr)) : null,
                status: allPassed ? "Accepted" : "Wrong Answer",
                memory: detailedResults.some((r) => r.memory) ? JSON.stringify(detailedResults.map((r) => r.memory)) : null,
                time: detailedResults.some((r) => r.time) ? JSON.stringify(detailedResults.map((r) => r.time)) : null
            }
        })

        // If all passed - true mark problem as solved for the current user
        if (allPassed) {
            await db.problemSolved.upsert({
                where: { userId_problemId: { userId, problemId } },
                update: {},
                create: { userId, problemId }
            })
        }

        // Save individual test case results using detailedResult
        const testCaseResults = detailedResults.map((result) => ({
            submissionId: submission.id,
            testCase: result.testCase,
            passed: result.passed,
            stdout: result.stdout,
            expected: result.expected,
            stderr: result.stderr,
            compileOutput: result.compile_output,
            status: result.status,
            memory: result.memory,
            time: result.time,
        }))

        await db.testCaseResult.createMany({
            data : testCaseResults
        })

        const submissionWithTestCase =  await db.submission.findUnique({
            where : {
                id : submission.id 
            },
            include : {
                testCases : true
            }
        })

        res.status(200).json(
            new ApiResponse(
                200,
                "Code Executed! Successfully!",
                {submission : submissionWithTestCase}
            )
        )
    } catch (error) {
        throw new ApiError(500, "Failed to execute code", error)
    }
}