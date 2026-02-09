require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  encryptionKey: process.env.ENCRYPTION_KEY,
  maxFileSize: 10 * 1024 * 1024, // 10MB

  // eLogbook form selectors - update these if eLogbook changes their UI
  elogbook: {
    loginUrl: 'https://client.elogbook.org/',
    addOperationUrl: 'https://client.elogbook.org/',
    selectors: {
      // These will need to be populated by inspecting the live eLogbook site
      username: '#username',
      password: '#password',
      loginButton: '#login-button',
      addOperation: 'a[href*="add-operation"]',
      dateField: '#operation-date',
      hospitalField: '#hospital',
      patientDob: '#patient-dob',
      patientSex: '#patient-sex',
      procedure: '#procedure',
      cepod: '#cepod',
      asaGrade: '#asa-grade',
      supervision: '#supervision',
      consultant: '#consultant',
      side: '#side',
      anaesthetic: '#anaesthetic',
      startTime: '#start-time',
      duration: '#duration',
      complications: '#complications',
      saveButton: '#save-operation'
    }
  }
};
