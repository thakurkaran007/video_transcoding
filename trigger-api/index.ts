import axios from "axios";


module.exports.handler = async (event: any) => {
    try {
        const s3EventData = event.Records[0].s3;

        const response = await axios.post(process.env.API_ENDPOINT!, {
            s3EventData
        })

        console.log("API Response:", response.data);
        console.log("API status:", response.status);

        return {
            statusCode: 200,
            body: JSON.stringify({
                status: "success",
                message: "S3 event processed successfully",
                body: response.data
            }),
        }
    } catch (error) {
        console.error("Error processing S3 event:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                status: "error",
                message: "Failed to process S3 event",
                error: error
            }),
        }
    }
}