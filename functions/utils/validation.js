// utils/validation.js
// Input validation utilities

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 */
function isValidEmail(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Validate required string field
 * @param {string} value - Value to validate
 * @param {string} fieldName - Name of field for error message
 * @returns {Object} Validation result { valid: boolean, error: string }
 */
function validateRequired(value, fieldName = 'Field') {
    if (!value || typeof value !== 'string' || !value.trim()) {
        return {
            valid: false,
            error: `${fieldName} is required`
        };
    }
    return { valid: true };
}

/**
 * Validate phone number (basic check for digits)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if contains digits
 */
function isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') {
        return false;
    }
    // Basic check - contains at least some digits
    return /\d/.test(phone);
}

/**
 * Sanitize string input (trim and limit length)
 * @param {string} value - Value to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized value
 */
function sanitizeString(value, maxLength = 1000) {
    if (!value || typeof value !== 'string') {
        return '';
    }
    return value.trim().substring(0, maxLength);
}

module.exports = {
    isValidEmail,
    validateRequired,
    isValidPhone,
    sanitizeString
};
