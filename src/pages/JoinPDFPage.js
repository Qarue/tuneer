import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import './JoinPDFPage.css'; // Style as needed

function JoinPDFPage() {
    const [pdfFiles, setPdfFiles] = useState([]);
    const [mergedPdfUrl, setMergedPdfUrl] = useState('');

    const handleFileChange = (event) => {
        const files = Array.from(event.target.files);
        setPdfFiles(files);
        event.target.value = ''; // Reset file input
    };

    const mergePdfs = async () => {
        const mergedPdf = await PDFDocument.create();

        for (const file of pdfFiles) {
            const fileBytes = await file.arrayBuffer();
            const pdf = await PDFDocument.load(fileBytes);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setMergedPdfUrl(url);
    };

    return (
        <div className="joinPdfPage">
            <input type="file" accept="application/pdf" multiple onChange={handleFileChange} />
            <ul>
                {pdfFiles.map((file, index) => (
                    <li key={index}>{file.name}</li>
                ))}
            </ul>
            {/* Implement reordering UI here */}
            <button onClick={mergePdfs}>Join PDFs</button>
            {mergedPdfUrl && <a href={mergedPdfUrl} download="merged.pdf">Download Merged PDF</a>}
        </div>
    );
}

export default JoinPDFPage;
