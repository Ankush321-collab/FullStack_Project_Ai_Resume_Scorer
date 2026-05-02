const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Master LaTeX Template Emulator (v2.0)
 * Strictly follows the user's Overleaf LaTeX structure.
 */
function createLatexStylePDF(resumeData, outputPath) {
  // LaTeX margins: 0.6in (43.2pt)
  const doc = new PDFDocument({
    margin: 43.2,
    size: 'LETTER',
    bufferPages: true
  });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  const FONT_REGULAR = 'Times-Roman';
  const FONT_BOLD = 'Times-Bold';
  const FONT_ITALIC = 'Times-Italic';
  const COLOR_BLACK = '#000000';
  const COLOR_SLATE = '#2E2E2E';
  const PAGE_WIDTH = 525.6; // 612 - 43.2*2

  // --- HEADING ---
  const candidateName = (resumeData.name || 'Candidate Name').toUpperCase();
  doc.font(FONT_BOLD).fontSize(19).fillColor(COLOR_BLACK).text(candidateName, { align: 'center' });
  doc.moveDown(0.01);
  
  doc.font(FONT_REGULAR).fontSize(8.5).text(resumeData.location || '', { align: 'center' });
  doc.moveDown(0.01);
  
  const contactParts = [resumeData.phone, resumeData.email].filter(Boolean);
  const socials = ['LinkedIn', 'GitHub', 'LeetCode', 'GeeksforGeeks', 'CodeChef'];
  const fullContact = [...contactParts, ...socials].join('  |  ');
  
  doc.fontSize(8).fillColor('#0000EE').text(fullContact, { align: 'center', underline: true });
  doc.moveDown(0.3);

  // --- SECTION HELPER ---
  const addSection = (title) => {
    doc.moveDown(0.2);
    doc.font(FONT_BOLD).fontSize(10).fillColor(COLOR_BLACK).text(title.toUpperCase());
    doc.moveDown(0.02);
    doc.lineWidth(0.4).strokeColor(COLOR_BLACK).moveTo(doc.x, doc.y).lineTo(doc.x + PAGE_WIDTH, doc.y).stroke();
    doc.moveDown(0.2);
  };

  // --- SUBHEADING ---
  const addSubheading = (leftTop, rightTop, leftSub, rightSub) => {
    doc.font(FONT_BOLD).fontSize(9).fillColor(COLOR_BLACK);
    // Row 1
    doc.text(leftTop, { continued: true });
    doc.text(rightTop, { align: 'right' });
    
    // Row 2
    doc.font(FONT_ITALIC).fontSize(8.5);
    doc.text(leftSub || '', { continued: true });
    doc.text(rightSub || '', { align: 'right' });
    doc.moveDown(0.2);
  };

  // --- PROJECT HEADING ---
  const addProjectHeading = (name, tech, date) => {
    doc.font(FONT_BOLD).fontSize(9).fillColor(COLOR_BLACK);
    doc.text(name, { continued: true });
    doc.font(FONT_ITALIC).text(` | ${tech || ''}`, { continued: false });
    
    if (date) {
        // Move back up slightly to place date on the same line if possible, 
        // but for pure flow stability, we'll just place it below or handle it via columns.
        // Let's use a simpler one-line approach for projects.
        doc.font(FONT_BOLD).text(date, { align: 'right' });
    }
    doc.moveDown(0.2);
  };

  // --- ITEM HELPER ---
  const addItem = (bullet) => {
    if (!bullet) return;
    let text = "";
    if (typeof bullet === 'object') {
        text = bullet.text || bullet.bullet || bullet.achievement || bullet.description || bullet.item || JSON.stringify(bullet);
        if (bullet.metric && text.indexOf(bullet.metric) === -1) {
            text += ` (${bullet.metric})`;
        }
    } else {
        text = bullet;
    }
    
    doc.font(FONT_REGULAR).fontSize(8.5).fillColor(COLOR_SLATE).text('• ' + text, { 
      indent: 12,
      lineGap: 0.5,
      paragraphGap: 0.8
    });
  };

  // --- 1. EDUCATION ---
  if (resumeData.education && Array.isArray(resumeData.education)) {
    addSection('EDUCATION');
    resumeData.education.forEach(edu => {
      if (edu) {
        addSubheading(edu.school || '', edu.dates || '', edu.degree || '', edu.location || '');
        if (edu.details) addItem(edu.details);
        doc.moveDown(0.2);
      }
    });
  }

  // --- 2. EXPERIENCE ---
  if (resumeData.experience && Array.isArray(resumeData.experience)) {
    addSection('EXPERIENCE');
    resumeData.experience.forEach(exp => {
      if (exp) {
        addSubheading(exp.company || '', exp.dates || '', exp.title || '', exp.location || '');
        let bullets = exp.bullets || exp.highlights || exp.details || exp.description || exp.points || exp.summary || [];
        if (typeof bullets === 'string') bullets = bullets.split('\n').filter(b => b.trim());
        if (Array.isArray(bullets)) bullets.forEach(addItem);
        doc.moveDown(0.2);
      }
    });
  }

  // --- 3. PROJECTS ---
  if (resumeData.projects && Array.isArray(resumeData.projects)) {
    addSection('PROJECTS');
    resumeData.projects.forEach(proj => {
      if (proj) {
        addProjectHeading(proj.name || '', proj.tech || '', proj.dates || '');
        let bullets = proj.bullets || proj.highlights || proj.details || proj.description || proj.points || proj.summary || [];
        if (typeof bullets === 'string') bullets = bullets.split('\n').filter(b => b.trim());
        if (Array.isArray(bullets)) bullets.forEach(addItem);
        doc.moveDown(0.2);
      }
    });
  }

  // --- 4. TECHNICAL SKILLS ---
  if (resumeData.skills) {
    addSection('TECHNICAL SKILLS');
    Object.entries(resumeData.skills).forEach(([category, skills]) => {
        const skillsList = Array.isArray(skills) ? skills.join(', ') : (typeof skills === 'object' ? Object.values(skills).join(', ') : skills);
        if (skillsList) {
          doc.font(FONT_BOLD).fontSize(9.5).fillColor(COLOR_BLACK).text(`${category}: `, { continued: true });
          doc.font(FONT_REGULAR).fillColor(COLOR_SLATE).text(skillsList);
          doc.moveDown(0.1);
        }
    });
  }

  // --- 5. ACHIEVEMENTS ---
  if (resumeData.achievements && resumeData.achievements.length > 0) {
    addSection('ACHIEVEMENTS');
    resumeData.achievements.forEach(addItem);
  }

  doc.end();
  return new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

module.exports = { createLatexStylePDF };
