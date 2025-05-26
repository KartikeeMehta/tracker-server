const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;

  await transporter.sendMail({
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
};

const sendInvitationEmail = async (email, token, tempPassword) => {
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;

  await transporter.sendMail({
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
};

const sendNewMemberCredentials = async (
  email,
  firstName,
  tempPassword,
  loginUrl,
  companyName
) => {
  await transporter.sendMail({
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
  });
};

module.exports = {
  sendVerificationEmail,
  sendInvitationEmail,
  sendNewMemberCredentials,
};
