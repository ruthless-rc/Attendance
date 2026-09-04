import io
import pandas as pd
from typing import List
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.models.attendance import Attendance

class ExportService:
    @staticmethod
    def _prepare_dataframe(records: List[Attendance]) -> pd.DataFrame:
        data = []
        for r in records:
            data.append({
                "Record ID": r.id,
                "User ID": r.user.unique_id if r.user else "N/A",
                "Full Name": r.user.full_name if r.user else "Unknown",
                "Department": r.user.department if r.user else "N/A",
                "Date": str(r.date),
                "Time": r.time,
                "Status": r.status.capitalize(),
                "Confidence": f"{r.confidence:.2%}" if r.confidence else "N/A",
                "Method": r.method.replace("_", " ").title(),
                "Liveness Verified": "Yes" if r.liveness_passed else "No"
            })
        return pd.DataFrame(data)

    def export_csv(self, records: List[Attendance]) -> io.BytesIO:
        """Export attendance records to in-memory CSV buffer."""
        df = self._prepare_dataframe(records)
        buffer = io.StringIO()
        df.to_csv(buffer, index=False)
        bytes_io = io.BytesIO(buffer.getvalue().encode('utf-8'))
        bytes_io.seek(0)
        return bytes_io

    def export_excel(self, records: List[Attendance]) -> io.BytesIO:
        """Export attendance records to in-memory Excel (.xlsx) file with styling."""
        df = self._prepare_dataframe(records)
        bytes_io = io.BytesIO()
        with pd.ExcelWriter(bytes_io, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name="Attendance Records")
            # Auto-adjust column width
            worksheet = writer.sheets["Attendance Records"]
            for col in worksheet.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                col_letter = col[0].column_letter
                worksheet.column_dimensions[col_letter].width = max(max_len + 4, 12)
        bytes_io.seek(0)
        return bytes_io

    def export_pdf(self, records: List[Attendance], title: str = "Attendance Report") -> io.BytesIO:
        """Export attendance records to a styled PDF document."""
        bytes_io = io.BytesIO()
        doc = SimpleDocTemplate(
            bytes_io,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )
        elements = []
        styles = getSampleStyleSheet()

        # Title
        title_style = ParagraphStyle(
            name="ReportTitle",
            parent=styles["Heading1"],
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#1e293b"),
            spaceAfter=6
        )
        elements.append(Paragraph(title, title_style))

        # Subtitle with date
        sub_style = ParagraphStyle(
            name="ReportSub",
            parent=styles["Normal"],
            fontSize=10,
            textColor=colors.HexColor("#64748b"),
            spaceAfter=15
        )
        elements.append(Paragraph(f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Total Records: {len(records)}", sub_style))

        # Table data
        headers = ["ID", "Name", "Dept", "Date", "Time", "Status", "Confidence"]
        table_data = [headers]
        for r in records[:200]:  # Cap at 200 records for PDF readability
            table_data.append([
                r.user.unique_id if r.user else "N/A",
                r.user.full_name[:18] if r.user else "Unknown",
                (r.user.department or "")[:12] if r.user else "N/A",
                str(r.date),
                r.time,
                r.status.capitalize(),
                f"{r.confidence:.2f}" if r.confidence else "N/A"
            ])

        col_widths = [60, 120, 80, 75, 65, 65, 75]
        t = Table(table_data, colWidths=col_widths)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2563eb")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('TOPPADDING', (0, 0), (-1, 0), 6),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.white]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
        ]))
        elements.append(t)
        doc.build(elements)
        bytes_io.seek(0)
        return bytes_io

export_service = ExportService()
