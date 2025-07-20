import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            statusCode: err.statusCode,
            message: err.message,
            errors: err.errors,
            data: null,
            success: false,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    };

    // Unknownn or unhandled errors
    return res.status(500).json({
        statusCode: 500,
        message: "Internal Server Error",
        errors: [],
        data: null,
        success: false,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
};

export default errorHandler;
