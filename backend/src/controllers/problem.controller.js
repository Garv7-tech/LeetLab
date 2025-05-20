import { db } from "../libs/db.js"
import {
    getJudge0LanguageId,
    pollBatchResults,
    submitBatch
} from "../libs/judge0.lib.js"

import { ApiResponse } from "../libs/apiResponse.js"
import { ApiError } from "../libs/apiError.js"

export const createProblem = async (req, res) => {
    // Destructure problem details from request body
    const {
        title,
        description,
        difficulty,
        tags,
        examples,
        constraints,
        testcases,
        codeSnippets,
        referenceSolutions
    } = req.body

    try {
        // Loop through each language and its reference solution
        for (const [language, solutionCode] of Object.entries(referenceSolutions)) {
            // Get Judge0 language ID for the given language
            const languageId = getJudge0LanguageId(language)

            // If language is not supported, throw an error
            if (!languageId) {
                throw new ApiError(400, `Language ${language} is not supported`)
            }

            // Prepare submissions for all testcases using the reference solution
            const submissions = testcases.map(({ input, output }) => ({
                source_code: solutionCode,   // Candidate/reference code
                language_id: languageId,     // Judge0 language ID
                stdin: input,                // Input for the test case
                expected_output: output      // Expected output for validation
            }))

            // Submit all testcases to Judge0 in a batch
            const submissionResults = await submitBatch(submissions)

            // Extract submission tokens for polling results
            const tokens = submissionResults.map((res) => res.token)

            // Poll until all submissions are processed
            const results = await pollBatchResults(tokens)

            // Check each result's status
            for (let i = 0; i < results.length; i++) {
                const result = results[i]
                console.log("Result------", result)

                // If any testcase fails (status.id !== 3), throw an error
                if (result.status.id !== 3) {
                    throw new ApiError(400, `Testcase ${i + 1} failed for language ${language}`)
                }
            }
        }

        // Create the problem in the database after passing all testcases
        const newProblem = await db.problem.create({
            data: {
                title,
                description,
                difficulty,
                tags,
                examples,
                constraints,
                testcases,
                codeSnippets,
                referenceSolutions,
                userId: req.user.id, // ID of the authenticated user (already validated by middleware)
            },
        })

        // Send success response with the created problem
        return res.status(201).json(
            new ApiResponse(
                201,
                "Problem created Successfully",
                { problem: newProblem }
            )
        )
    } catch (error) {
        // Handle any error during the problem creation process
        throw new ApiError(500, "Error while creating problem", error)
    }
}

export const getAllProblems = async (req, res) => {
    try {
        // fetch all the problems from the db
        const problems = await db.problem.findMany()

        if (!problem) {
            throw new ApiError(404, "No Problems Found")
        }

        // send response
        return res.status(200).json(
            new ApiResponse(
                200,
                "Message(s) Fetched Successfully",
                problems
            )
        )
    } catch (error) {
        throw new ApiError(500, "Error While Fetching Problems", error)
    }
}

export const getProblemById = async (req, res) => {
    // access the id from the url
    const { id } = req.params
    try {
        // find problem based on id from the db
        const problem = await db.problem.findUnique()
        // if problem not found send ApiError
        if (!problem) {
            throw new ApiError(404, "Problem Not Found")
        }
        // send response
        return res.status(200).json(
            new ApiResponse(
                200,
                "Message Found Successfully",
                problem
            )
        )
    } catch (error) {
        throw new ApiError(500, "Error While Fetching Problem By Id", error)
    }
}

export const updateProblem = async (req, res) => {
    // Get problem-id from params
    const { id } = req.params

    try {
        // Find problem by id in database
        const problem = await db.problem.findUnique({
            where: {
                id
            },
        })
        // If problem not found, throw 404 error
        if (!problem) {
            throw new ApiError(404, "Problem Not Found")
        }

        // destructure the updated-problem  from the req.body
        const {
            title,
            description,
            difficulty,
            tags,
            examples,
            constraints,
            testcases,
            codeSnippets,
            referenceSolutions,
        } = req.body

        // Validate reference solutions (if provided)
        try {
            // Loop through each language and solution
            for (const [language, solutionCode] of Object.entries(referenceSolutions)) {
                // Get Judge0 language ID
                const languageId = getJudge0LanguageId(language)

                if (!languageId) {
                    throw new ApiError(400, `Language ${language} is not supported`)
                }
                // Create test submissions
                const submissions = testcases.map(({ input, output }) => ({
                    source_code: solutionCode,
                    language_id: languageId,
                    stdin: input,
                    expected_output: output
                }))

                // Submit batch and poll results
                const submissionResults = await submitBatch(submissions)

                const tokens = submissionResults.map((res) => res.token) // extract the tokens from submissionResults

                const results = await pollBatchResults(tokens)

                // Check if all tests pass
                for (let i = 0; i < results.length; i++) {
                    const result = results[i]
                    if (result.status.id !== 3) {
                        throw new ApiError(400, `Testcase ${i + 1} failed for language ${language}`)
                    }
                }
            }
        } catch (error) {
            throw new ApiError()
        }

        // Update problem in database with new data
        const updatedProblem = await db.problem.update({
            where: {
                id
            },
            data: {
                title,
                description,
                difficulty,
                tags,
                examples,
                constraints,
                testcases,
                codeSnippets,
                referenceSolutions,
                updatedAt: new Date()
            }
        })

        // Return success response with updated problem
        return res.status(200).json(
            new ApiResponse(
                200,
                "Problem updated successfully",
                updatedProblem
            )
        )
    } catch (error) {
        // Handle any errors during update
        throw new ApiError(500, "Error while updating the problem", error)
    }
}


export const deleteProblem = async (req, res) => {
    // get id from url parameters
    const { id } = req.params

    try {
        // find problem by id in database
        const problem = await db.problem.findUnique({
            where: {
                id
            }
        })

        // check if problem exists or not
        if (!problem) {
            throw new ApiError(404, "Problem not found")
        }

        // delete the problem
        await db.problem.delete({ where: { id } })

        // send response
        return res.status(200).json(
            new ApiResponse(
                200,
                "Problem Deleted Successfully"
            )
        )
    } catch (error) {
        throw new ApiError(500, "Error while deleting the problem")
    }
}


export const getAllProblemsSolvedByUser = async (req, res) => {
    try {
        const problems = await db.problem.findMany({
            //  Only get problems that the current user has solved
            where: {
                solvedBy: {
                    some: {
                        userId: req.user.id  // Match if at least one user who solved the problem is me
                    }
                }
            },
            // For each problem, also include my user data in the solvedBy list (optional, for frontend)
            include: {
                solvedBy: {
                    where: {
                        userId: req.user.id  // Only include me (not other users) in the solvedBy list
                    }
                }
            }
        });

        // Send back the list of problems I solved
        res.status(200).json({
            success: true,
            message: "Problems fetched successfully",
            problems
        });

        return res.status(200).json(
            new ApiResponse(
                200,
                `${req.user.id} problems fetched successfully`
            )
        )
    } catch (error) {
        //  Something went wrong while getting the data
        throw new ApiError(500, "Failed to fetch problems")
    }
}


