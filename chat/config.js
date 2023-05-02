module.exports = {
    port: '6161',
    db: {
        host: "161.97.164.226",
        port: "27017",
        userName: "pinksurfuser",
        password: "pdfznWxPMW",
	dbName:'pinkSurf'
    },

    attachmentPath: `${__dirname}/attachments`,

    attachmentImgPath : 'http://161.97.164.227:8081/',

    token: {
        password: 'password'
    },
    services: {
        emailService: 'http://localhost:61601'
    },
    securityQuestions: [
        "What primary school did you attend?",
        "What was your childhood nickname?",
        "What is the name of your favorite childhood friend",
        "What is your pet's name?"
    ]
}
