export const validateBody = (
    schema
) =>
    (req, _res, next) => {
        try {
            req.body = schema.parse(
                req.body || {}
            );
            next();
        } catch (error) {
            next(error);
        }
    };