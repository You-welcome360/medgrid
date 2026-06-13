Route style: /api/v1/...
Response format
Error format
Pagination format
Auth behavior
HTTP status usage
OpenAPI-first rule

Example response standard:

{
"success": true,
"data": {},
"meta": {}
}
Example error standard:

{
"success": false,
"error": {
"code": "VALIDATION_ERROR",
"message": "Invalid request body",
"details": []
}
}
