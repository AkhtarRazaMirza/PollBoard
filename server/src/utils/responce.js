export class ApiResponse {
    constructor(
        statusCode = 200,
        data = null,
        message = "Success"
    ) {
        this.success = statusCode < 400;
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
    }

    static success(
        data = null,
        message = "Success",
        statusCode = 200
    ) {
        return new ApiResponse(
            statusCode,
            data,
            message
        );
    }

    static created(
        message = "Resource created successfully",
        data = null
    ) {
        return new ApiResponse(
            201,
            message,
            data
        );
    }

    static updated(
        message = "Resource updated successfully",
        data = null
    ) {
        return new ApiResponse(
            200,
            message,
            data
        );
    }

    static deleted(
        message = "Resource deleted successfully",
        data = null
    ) {
        return new ApiResponse(
            200,
            message,
            data
        );
    }

    static fetched(
        message = "Data fetched successfully",
        data = null
    ) {
        return new ApiResponse(
            200,
            message,
            data
        );
    }

    static findOne(
        massage = "Data finded successfully",
        data = null
    ) {
        return new ApiResponse(
            200,
            massage,
            data
        )
    }
}

export default ApiResponse;