import { db } from "../libs/db.js"
import { ApiResponse } from "../libs/apiResponse.js"
import { ApiError } from "../libs/apiError.js"

export const getAllSubmission = async (req, res) => {
    try {
        // fetch userId from req.user
        const userId = req.user.id

        // find submissions in db based on userId
        const submissions = await db.submission.findMany({
            where: {
                userId: userId
            }
        })

        // send response
        res.status(200).json(
            new ApiResponse(
                200,
                "Submissions fetched successfully",
                { submissions }
            ))
    } catch (error) {
        throw new ApiError(500, "Failed to fetch submissions", error)
    }
}

export const getSubmissionsForProblem = async (req, res) => {
    try {
        // fetch userId from req.user
        const userId = req.user.id

        // fetch problemId from params
        const problemId = req.params.problem.id

        // find submissions in db by userId, problemId
        const submissions = await db.submission.findMany({
            where: {
                userId: userId,
                problemId: problemId
            }
        })

        // send response
        res.status(200).json(
            new ApiResponse(
                200,
                "Submission fetched successfully",
                { submissions }
            )
        )

    } catch (error) {
        throw new ApiError(500, "Failed to fetch submissions", error)
    }
}

export const getAllTheSubmissionsForProblem = async (req, res) => {
    try {
        // fetch problemId from params
        const problemId = req.params
        
        // count submissions for the problem in db
        const submission = await db.submission.count({
            where : {
                problemId : problemId
            }
        })
        // send response
        res.satus(200).json(
            new ApiResponse(
                200,
                "Submissions Fetched Successfully",
                {count : submission}
            )
        )
    } catch (error) {
        throw new ApiError(500, "Failed to fetch submissions", error)
    }
}