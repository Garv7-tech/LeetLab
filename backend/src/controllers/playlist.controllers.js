import { db } from "../libs/db.js"
import { ApiResponse } from "../libs/apiResponse.js"
import { ApiError } from "../libs/apiError.js"

export const createPlaylist = async (req, res) => {
    try {
        // fetch name and description from req.body
        const { name, description } = req.body

        // fetch userId from req.user
        const userId = req.user.id

        // create a playlist and store it in db
        const playlist = await db.playlist.create({
            data: {
                name,
                description,
                userId
            }
        })

        // send response
        res.status(200).json(
            new ApiResponse(
                200,
                "Playlist created successfully",
                { playlist }
            )
        )
    } catch (error) {
        throw new ApiError(500, "Failed to create playlist", error)
    }
}

export const getAllListDetails = async (req, res) => {
    try {
        // find playlists in db based on userId
        const playlists = await db.playlist.findMany({
            where: {
                userId: req.user.id
            },
            include: {
                problems: {
                    include: {
                        problem: true
                    }
                }
            }
        })

        // send response
        res.status(200).json(
            new ApiResponse(
                200,
                "Playlist fetched successfully",
                { playlists }
            )
        )
    } catch (error) {
        throw new ApiError(500, "Failed To Fetch Playlist", error)
    }
}

export const getPlayListDetails = async (req, res) => {
    // fetch playlistId from params
    const { playlistId } = req.params
    try {
        // find unique playlist based on playlistId and userId
        const playlist = await db.playlist.findUnique({
            where: {
                id: playlistId,
                userId: req.user.id
            },
            include: {
                problems: {
                    include: {
                        problem: true
                    }
                }
            }
        })

        // if unique playlist not found then throw error
        if (!playlist) {
            throw new ApiError(404, "Playlist not found")
        }

        // send response
        res.status(200).json(
            new ApiResponse(
                200,
                "Playlist fetched successfully",
                { playlist }
            )
        )

    } catch (error) {
        throw new ApiError(500, "Failed to fetch playlist", error)
    }
}

export const addProblemToPlaylist = async (req, res) => {
    // fetch playlistId from params
    const { playlistId } = req.params

    // fetch problemIds from req.body
    const { problemIds } = req.body

    try {
        // validate problemIds
        if (!Array.isArray(problemIds) || problemIds.length === 0) {
            throw new ApiError(400, "Invalid or missing problemIds: Please provide a non-empty array of problem IDs to add to the playlist.")
        }

        // Create records for each problems in the playlist
        const problemsInPlaylist = await db.problemsInPlaylist.createMany({
            data: problemIds.map((problemId) => ({
                playlistId,
                problemId,
            }))
        })

        // send response
        res.status(201).json(
            new ApiResponse(
                201,
                "Problems added to playlist successfully",
                { problemsInPlaylist }
            )
        )

    } catch (error) {
        throw new ApiError(500, "Failed to adding problem in playlist", error)
    }
}

export const deletePlaylist = async (req, res) => {
    // get playlistId from params
    const { playlistId } = req.params
    try {
        // find and delete playlist in db based on playlistId 
        const deletedPlaylist = await db.playlist.delete({
            where: {
                id: playlistId
            }
        })

        // send response
        res.status(200).json(
            new ApiResponse(
                200,
                "Playlist deleted successfully",
                { deletedPlaylist }
            )
        )

    } catch (error) {
        throw new ApiError(500, "Failed to delete playlist", error)
    }
}

export const removeProblemFromPlaylist = async (req, res) => {
    // get playlistId from params
    const { playlistId } = req.params

    // get problemIds from req.body
    const { problemIds } = req.body

    try {
        // validate problemIds
        if (!Array.isArray(problemIds) || problemIds.length === 0) {
            throw new ApiError(400, "Invalid or missing problemIds: Please provide a non-empty array of problem IDs to add to the playlist.")
        }

        // delete problemsInPlaylist from db based on playlistId and problemId
        const deletedProblem = await db.problemsInPlaylist.deleteMany({
            where : {
                playlistId,
                problemId : {
                    in : problemIds
                }
            }
        })

        // send response
        res.status(200).json(
            new ApiResponse(
                200,
                "Problem removed from playlist successfully",
                {deletedProblem}
            )
        )

    } catch (error) {
        throw new ApiError( 500, "Failed to remove problem from playlist", error )
    }
}