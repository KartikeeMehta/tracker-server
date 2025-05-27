const nodemailer = require("nodemailer");

// Validate required environment variables
const requiredEnvVars = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "CLIENT_URL",
];

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);
if (missingEnvVars.length > 0) {
  console.error("Missing required environment variables:", missingEnvVars);
}

// Log SMTP configuration (without sensitive data)
console.log("SMTP Config Check:", {
  host: process.env.SMTP_HOST || "Not Set",
  port: process.env.SMTP_PORT || "Not Set",
  secure: process.env.SMTP_SECURE || "Not Set",
  user: process.env.SMTP_USER || "Not Set",
  from: process.env.SMTP_FROM || "Not Set",
  clientUrl: process.env.CLIENT_URL || "Not Set",
});

// Create transporter with debug enabled
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify SMTP connection
transporter.verify(function (error, success) {
  if (error) {
    console.error("SMTP Connection Error:", {
      message: error.message,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      response: error.response,
    });
  } else {
    console.log("SMTP Server is ready to take our messages");
  }
});

const sendVerificationEmail = async (email, token) => {
  try {
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;
    console.log("Sending verification email to:", email);

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Verify your email address",
      html: `
        <h1>Welcome to TimeTracker!</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
        <p>This link will expire in 24 hours.</p>
      `,
    });

    console.log("Verification email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
};

const sendInvitationEmail = async (email, token, tempPassword) => {
  try {
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;
    console.log("Sending invitation email to:", email);

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "You have been invited to join TimeTracker",
      html: `
        <h1>Welcome to TimeTracker!</h1>
        <p>You have been invited to join a company on TimeTracker.</p>
        <p>Your temporary password is: <strong>${tempPassword}</strong></p>
        <p>Please click the link below to verify your email address and set up your account:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
        <p>This link will expire in 24 hours.</p>
        <p>Please change your password after logging in.</p>
      `,
    });

    console.log("Invitation email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending invitation email:", error);
    throw error;
  }
};

const sendNewMemberCredentials = async (
  email,
  firstName,
  tempPassword,
  loginUrl,
  companyName
) => {
  try {
    if (!process.env.SMTP_FROM) {
      throw new Error("SMTP_FROM environment variable is not set");
    }

    console.log("Sending new member credentials to:", email);
    console.log("Email configuration:", {
      from: process.env.SMTP_FROM,
      to: email,
      subject: `Welcome to ${companyName}! Your account has been created`,
      loginUrl,
      companyName,
    });

    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: `Welcome to ${companyName}! Your account has been created`,
      html: `
        <h1>Welcome to ${companyName}!</h1>
        <p>Hi ${firstName},</p>
        <p>You have been added to <b>${companyName}</b>.</p>
        <p>Your login credentials are:</p>
        <ul>
          <li><b>Email:</b> ${email}</li>
          <li><b>Temporary Password:</b> ${tempPassword}</li>
        </ul>
        <p>Please <a href="${loginUrl}">log in here</a> and change your password after logging in.</p>
        <p>Best regards,<br/>${companyName} Team</p>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("New member credentials email sent:", {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
    });
    return info;
  } catch (error) {
    console.error("Error sending new member credentials:", {
      message: error.message,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      response: error.response,
      stack: error.stack,
    });
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
  sendInvitationEmail,
  sendNewMemberCredentials,
};
