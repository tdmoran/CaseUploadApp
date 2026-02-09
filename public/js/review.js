// Field review and edit module

const Review = {
  fieldMap: {
    date: 'field-date',
    hospital: 'field-hospital',
    patientDob: 'field-patient-dob',
    patientSex: 'field-patient-sex',
    procedure: 'field-procedure',
    cepod: 'field-cepod',
    asaGrade: 'field-asa-grade',
    supervision: 'field-supervision',
    consultant: 'field-consultant',
    side: 'field-side',
    anaesthetic: 'field-anaesthetic',
    startTime: 'field-start-time',
    duration: 'field-duration',
    complications: 'field-complications'
  },

  populateFields(data) {
    // Clear all low-confidence markers
    document.querySelectorAll('.field-group').forEach(g => {
      g.classList.remove('low-confidence');
    });

    const fields = data.fields || {};
    const confidence = data.confidence || {};

    // Populate each field
    for (const [key, elementId] of Object.entries(this.fieldMap)) {
      const el = document.getElementById(elementId);
      if (!el) continue;

      const value = fields[key] || '';

      if (el.type === 'date' && value) {
        // Convert dd-mm-yyyy or various formats to yyyy-mm-dd for date input
        el.value = this.parseDate(value);
      } else {
        el.value = value;
      }

      // Mark low-confidence fields
      if (confidence[key] !== undefined && confidence[key] < 0.7) {
        const group = el.closest('.field-group');
        if (group) group.classList.add('low-confidence');
      }
    }

    // Apply default hospital if field is empty (localStorage is synced from server)
    const hospitalField = document.getElementById('field-hospital');
    if (!hospitalField.value) {
      const defaultHospital = localStorage.getItem('setting-hospital');
      if (defaultHospital) hospitalField.value = defaultHospital;
    }

    // Apply default consultant if field is empty (localStorage is synced from server)
    const consultantField = document.getElementById('field-consultant');
    if (!consultantField.value) {
      const defaultConsultant = localStorage.getItem('setting-consultant');
      if (defaultConsultant) consultantField.value = defaultConsultant;
    }

    // Update confidence badge
    this.updateConfidenceBadge(confidence);
  },

  parseDate(dateStr) {
    if (!dateStr) return '';

    // Already in yyyy-mm-dd format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    // dd-mm-yyyy or dd/mm/yyyy
    const match = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (match) {
      const [, day, month, year] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Try natural language date parsing as fallback
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return '';
  },

  updateConfidenceBadge(confidence) {
    const badge = document.getElementById('confidence-badge');
    const values = Object.values(confidence);
    if (values.length === 0) {
      badge.textContent = '--';
      return;
    }

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const pct = Math.round(avg * 100);
    badge.textContent = `${pct}% conf.`;

    badge.style.background = pct >= 80
      ? 'var(--green-bg)'
      : pct >= 60
        ? 'var(--amber-bg)'
        : 'var(--red-bg)';

    badge.style.color = pct >= 80
      ? 'var(--green)'
      : pct >= 60
        ? 'var(--amber)'
        : 'var(--red)';
  },

  getFieldValues() {
    const result = {};
    for (const [key, elementId] of Object.entries(this.fieldMap)) {
      const el = document.getElementById(elementId);
      if (!el) continue;

      if (el.type === 'date' && el.value) {
        // Convert back to dd-mm-yyyy for eLogbook
        const [y, m, d] = el.value.split('-');
        result[key] = `${d}-${m}-${y}`;
      } else {
        result[key] = el.value;
      }
    }
    return result;
  },

  clearFields() {
    for (const elementId of Object.values(this.fieldMap)) {
      const el = document.getElementById(elementId);
      if (el) el.value = '';
    }
    document.querySelectorAll('.field-group').forEach(g => {
      g.classList.remove('low-confidence');
    });
    document.getElementById('confidence-badge').textContent = '--';
  }
};
