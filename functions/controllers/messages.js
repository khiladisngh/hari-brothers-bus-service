// controllers/messages.js
// Contact form messages controller with structured logging and circuit breaker

const { getDb, getAdmin } = require('../config/firebase');
const { getTransporter } = require('../config/nodemailer');
const { log, logError, LogSeverity, PerformanceTimer } = require('../middleware/logger');
const { emailCircuitBreaker } = require('../utils/circuitBreaker');
const { withRetry } = require('../utils/retry');

/**
 * Save contact form message to Firestore and send email
 * @param {Object} messageData - Contact form data
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Result with document ID and email status
 */
async function saveMessage(messageData, correlationId = null) {
    const { firstName, lastName, email, phoneNumber, message } = messageData;
    const perfTimer = new PerformanceTimer(correlationId);

    try {
        // Send email if configured
        let emailInfo = null;
        const transporter = getTransporter();
        const emailRecipient = process.env.CONTACT_FORM_RECIPIENT;
        const emailUser = process.env.EMAIL_USER;

        if (transporter && emailRecipient && emailUser) {
            try {
                perfTimer.mark('email-start');
                
                // Use circuit breaker for email service
                emailInfo = await emailCircuitBreaker.execute(async () => {
                    return await transporter.sendMail({
                        from: `"Hari Bus Service Website" <${emailUser}>`,
                        to: emailRecipient,
                        replyTo: email,
                        subject: `New Contact Form Submission from ${firstName} ${lastName}`,
                        text: `Name: ${firstName} ${lastName}\nEmail: ${email}\nPhone: ${phoneNumber}\n\nMessage:\n${message}`,
                        html: `<p><strong>Name:</strong> ${firstName} ${lastName}</p><p><strong>Email:</strong> ${email}</p><p><strong>Phone:</strong> ${phoneNumber}</p><p><strong>Message:</strong></p><p>${message}</p>`
                    });
                }, correlationId);
                
                perfTimer.mark('email-end');

                log(
                    LogSeverity.INFO,
                    'Contact form email sent',
                    {
                        operation: 'sendContactEmail',
                        messageId: emailInfo.messageId,
                        recipient: emailRecipient,
                        emailTimeMs: perfTimer.getDuration('email-start', 'email-end')
                    },
                    correlationId
                );
            } catch (emailError) {
                logError(emailError, 'sendContactEmail', correlationId);
                log(
                    LogSeverity.WARNING,
                    'Email sending failed, continuing with DB save',
                    { 
                        recipient: emailRecipient,
                        circuitState: emailError.circuitState || 'N/A'
                    },
                    correlationId
                );
            }
        }

        // Save to Firestore with retry logic
        const db = getDb();
        const admin = getAdmin();
        perfTimer.mark('db-save-start');

        const docRef = await withRetry(
            () => db.collection("messages").add({
                firstName,
                lastName,
                email,
                phoneNumber,
                message,
                emailMessageId: emailInfo?.messageId || null,
                submittedAt: admin.firestore.FieldValue.serverTimestamp()
            }),
            'saveContactMessage',
            correlationId
        );

        perfTimer.mark('db-save-end');

        log(
            LogSeverity.INFO,
            'Contact form message saved',
            {
                operation: 'saveMessage',
                documentId: docRef.id,
                emailSent: !!emailInfo,
                dbSaveTimeMs: perfTimer.getDuration('db-save-start', 'db-save-end'),
                totalTimeMs: perfTimer.getDuration()
            },
            correlationId
        );

        return {
            documentId: docRef.id,
            emailSent: !!emailInfo,
            emailMessageId: emailInfo?.messageId
        };
    } catch (error) {
        logError(error, 'saveMessage', correlationId);
        throw error;
    }
}

/**
 * Validate contact form data
 * @param {Object} data - Form data to validate
 * @returns {Object} Validation result
 */
function validateMessageData(data) {
    const { firstName, lastName, email, phoneNumber, message } = data;

    const errors = [];

    if (!firstName || !firstName.trim()) {
        errors.push("First name is required");
    }
    if (!lastName || !lastName.trim()) {
        errors.push("Last name is required");
    }
    if (!email || !email.trim()) {
        errors.push("Email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push("Invalid email format");
    }
    if (!phoneNumber || !phoneNumber.trim()) {
        errors.push("Phone number is required");
    }
    if (!message || !message.trim()) {
        errors.push("Message is required");
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

module.exports = { saveMessage, validateMessageData };
