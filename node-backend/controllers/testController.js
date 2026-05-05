/**
 * @desc    Test API endpoint
 * @route   GET /api/test
 * @access  Public
 */
const testApi = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            message: 'API working'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    testApi
};
