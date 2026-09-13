package com.nagarseva.service;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.nagarseva.entity.Complaint;
import com.opencsv.CSVWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.util.List;

@Service
public class ExportService {

    public byte[] exportComplaintsToCsv(List<Complaint> complaints) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (CSVWriter writer = new CSVWriter(new OutputStreamWriter(out))) {
            String[] header = {"ID", "Category", "Ward", "Status", "Date", "Description"};
            writer.writeNext(header);

            for (Complaint c : complaints) {
                String[] data = {
                        String.valueOf(c.getId()),
                        c.getCategory(),
                        c.getWard(),
                        c.getStatus().name(),
                        c.getCreatedAt() != null ? c.getCreatedAt().toString() : "",
                        c.getDescription()
                };
                writer.writeNext(data);
            }
        }
        return out.toByteArray();
    }

    public byte[] exportComplaintsToPdf(List<Complaint> complaints) throws DocumentException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document();
        PdfWriter.getInstance(document, out);
        document.open();

        document.add(new Paragraph("My Complaints History"));
        document.add(new Paragraph(" "));

        PdfPTable table = new PdfPTable(6);
        table.setWidthPercentage(100);
        table.addCell("ID");
        table.addCell("Category");
        table.addCell("Ward");
        table.addCell("Status");
        table.addCell("Date");
        table.addCell("Description");

        for (Complaint c : complaints) {
            table.addCell(String.valueOf(c.getId()));
            table.addCell(c.getCategory());
            table.addCell(c.getWard());
            table.addCell(c.getStatus().name());
            table.addCell(c.getCreatedAt() != null ? c.getCreatedAt().toString() : "");
            table.addCell(c.getDescription());
        }

        document.add(table);
        document.close();
        return out.toByteArray();
    }
}
