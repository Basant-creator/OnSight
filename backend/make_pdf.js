const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument();
const writeStream = fs.createWriteStream('sample_exam.pdf');
doc.pipe(writeStream);

doc.fontSize(20).text('Sample Exam Paper', { align: 'center' });
doc.moveDown();

doc.fontSize(12).text(`1. What is the capital of France?
A) London
B) Berlin
C) Paris
D) Madrid
Correct Answer: C
Explanation: Paris is the capital of France.

2. Which planet is known as the Red Planet?
A) Venus
B) Mars
C) Jupiter
D) Saturn
Correct Answer: B
Explanation: Mars is called the Red Planet due to its iron oxide surface.
`);

doc.end();
writeStream.on('finish', () => {
    console.log('PDF generated properly.');
});
