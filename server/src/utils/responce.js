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
        data = null,
        message = "Resource created successfully"
    ) {
        return new ApiResponse(
            201,
            data,
            message
        );
    }

    static updated(
        data = null,
        message = "Resource updated successfully"
    ) {
        return new ApiResponse(
            200,
            data,
            message
        );
    }

    static deleted(
        data = null,
        message = "Resource deleted successfully"
    ) {
        return new ApiResponse(
            200,
            data,
            message
        );
    }

    static fetched(
        data = null,
        message = "Data fetched successfully"
    ) {
        return new ApiResponse(
            200,
            data,
            message
        );
    }

    static findOne(
        data = null,
        message = "Data found successfully"
    ) {
        return new ApiResponse(
            200,
            data,
            message
        );
    }
}

export default ApiResponse;