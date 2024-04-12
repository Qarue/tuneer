import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
// import './SplitPDFPage.css'; // Style as needed

function SplitPDFPage() {
    const [file, setFile] = useState(null);

    const onFileChange = (event) => {
        setFile(event.target.files[0]);
    };

    const onFileUpload = async () => {
        if (file) {
            const fileReader = new FileReader();
            fileReader.onloadend = async () => {
                const pdfDoc = await PDFDocument.load(fileReader.result);
                const pageCount = pdfDoc.getPageCount();

                for (let i = 0; i < pageCount; i++) {
                    const newPdfDoc = await PDFDocument.create();
                    const [page] = await newPdfDoc.copyPages(pdfDoc, [i]);
                    newPdfDoc.addPage(page);
                    const pdfBytes = await newPdfDoc.save();

                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
                    link.download = `page_${i + 1}.pdf`;
                    link.click();
                }
            };
            fileReader.readAsArrayBuffer(file);
        }
    };

    return (
        <div className="SplitPDFPage">
            <input type="file" onChange={onFileChange} accept="application/pdf" />
            <button onClick={onFileUpload}>Split PDF</button>
        </div>
    );
}

export default SplitPDFPage;