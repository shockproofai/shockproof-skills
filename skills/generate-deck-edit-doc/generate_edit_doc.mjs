#!/usr/bin/env node
/**
 * Generate a Word document (.docx) for human text editing from a PDF extraction.
 *
 * Usage: node generate_edit_doc.mjs <intermediate.json> [output.docx]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { execSync } from "child_process";

// ── Auto-install docx into a local node_modules/ ───────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localPkg = path.join(__dirname, "node_modules", "docx");

if (!fs.existsSync(localPkg)) {
  console.error("First run: installing docx into skill node_modules/ …");
  // Ensure the directory containing the running Node binary is on PATH so
  // that npm (a shell script invoking `node`) can find it, even in
  // non-interactive shells where PATH may be minimal.
  const nodeDir = path.dirname(process.execPath);
  const env = { ...process.env, PATH: `${nodeDir}:${process.env.PATH || ""}` };
  execSync("npm install --save docx", { cwd: __dirname, stdio: "inherit", env });
  console.error("Done.");
}

const localRequire = createRequire(path.join(__dirname, "_virtual.cjs"));
// ────────────────────────────────────────────────────────────────────────

const {
  Document, Packer, Paragraph, TextRun, Header, Footer,
  AlignmentType, HeadingLevel, PageBreak, PageNumber,
  TabStopType, TabStopPosition, LevelFormat,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle
} = localRequire("docx");

const data = JSON.parse(fs.readFileSync(process.argv[2], "utf-8"));
const outputPath = process.argv[3] ||
  path.join(path.dirname(process.argv[2]), `${data.deck_name}_edit.docx`);

function truncateTitle(text, max = 80) {
  if (!text) return "(Untitled)";
  const oneLine = text.replace(/\n/g, " ").trim();
  return oneLine.length > max ? oneLine.slice(0, max) + "..." : oneLine;
}

// Build a body paragraph from an extraction paragraph object.
// paraObj can be a string (legacy) or { text, bullet, autonum }.
function bodyPara(paraObj) {
  const text = typeof paraObj === "string" ? paraObj : paraObj.text;
  const bullet = typeof paraObj === "object" ? paraObj.bullet : null;
  const autonum = typeof paraObj === "object" ? paraObj.autonum : null;
  const opts = {
    spacing: { before: 20, after: 20 },
    children: [new TextRun({ text, font: "Calibri", size: 20 })]
  };
  if (bullet) {
    opts.numbering = { reference: "bullets", level: 0 };
  } else if (autonum) {
    opts.numbering = { reference: "numbers", level: 0 };
  }
  return new Paragraph(opts);
}

function buildSlideSection(slide, isLast) {
  const children = [];
  const titleDisplay = truncateTitle(slide.title);
  const hasAnyContent = slide.title || slide.subtitle ||
    slide.body_shapes.length > 0 || slide.speaker_notes.length > 0;

  // Heading 1: Slide boundary
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 0, after: 60 },
    children: [new TextRun({
      text: `Slide ${slide.slide_number} \u2014 ${titleDisplay}`,
      bold: true, font: "Calibri", size: 28, color: "1A4FE8"
    })]
  }));

  if (!hasAnyContent) {
    children.push(new Paragraph({
      children: [new TextRun({
        text: "[No editable text on this slide]",
        font: "Calibri", size: 20, italics: true, color: "888888"
      })]
    }));
  } else {
    // Title section
    if (slide.title) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 120, after: 40 },
        children: [new TextRun({
          text: "Title", bold: true, font: "Calibri", size: 22, color: "B85042"
        })]
      }));
      for (const line of slide.title.split("\n")) {
        children.push(bodyPara(line));
      }
    }

    // Subtitle section
    if (slide.subtitle) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 120, after: 40 },
        children: [new TextRun({
          text: "Subtitle", bold: true, font: "Calibri", size: 22, color: "B85042"
        })]
      }));
      for (const line of slide.subtitle.split("\n")) {
        children.push(bodyPara(line));
      }
    }

    // Body section
    if (slide.body_shapes.length > 0) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 120, after: 40 },
        children: [new TextRun({
          text: "Body", bold: true, font: "Calibri", size: 22, color: "B85042"
        })]
      }));

      if (slide.table) {
        // Table layout — render as a multi-column Word table
        const tbl = slide.table;
        const tableWidth = 10080; // DXA, full content width

        // Auto-size columns proportionally based on max content length per column.
        const maxLens = Array(tbl.columns).fill(0);
        for (const row of tbl.rows) {
          row.cells.forEach((cellParas, ci) => {
            const len = cellParas.reduce((sum, p) => sum + (p.text || "").length, 0);
            if (len > maxLens[ci]) maxLens[ci] = len;
          });
        }
        const MIN_WEIGHT = 5;
        const weights = maxLens.map(l => Math.max(l, MIN_WEIGHT));
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        const columnWidths = weights.map(w => Math.round((w / totalWeight) * tableWidth));
        const allocated = columnWidths.reduce((a, b) => a + b, 0);
        columnWidths[columnWidths.length - 1] += tableWidth - allocated;

        const tblBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
        const tblBorders = { top: tblBorder, bottom: tblBorder, left: tblBorder, right: tblBorder };
        const headerShading = { fill: "E8EDF3", type: ShadingType.CLEAR };
        const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

        const tableRows = tbl.rows.map((row, ri) =>
          new TableRow({
            children: row.cells.map((cellParas, ci) =>
              new TableCell({
                borders: tblBorders,
                shading: ci === 0 ? headerShading : { fill: "FFFFFF", type: ShadingType.CLEAR },
                margins: cellMargins,
                width: { size: columnWidths[ci], type: WidthType.DXA },
                children: cellParas.length > 0
                  ? cellParas.map(p => new Paragraph({
                      spacing: { before: 10, after: 10 },
                      children: [new TextRun({
                        text: p.text,
                        font: "Calibri",
                        size: 20,
                        bold: ci === 0,
                      })]
                    }))
                  : [new Paragraph({ children: [] })]
              })
            )
          })
        );

        children.push(new Table({
          width: { size: tableWidth, type: WidthType.DXA },
          columnWidths,
          rows: tableRows
        }));

        // Trailing paragraphs (content that didn't fit the table pattern)
        if (tbl.trailing && tbl.trailing.length > 0) {
          for (const p of tbl.trailing) {
            children.push(bodyPara(p));
          }
        }
      } else if (slide.cards && slide.cards.length > 0) {
        // Card layout — render each card as a bordered box (single-cell table)
        const cardBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
        const cardBorders = { top: cardBorder, bottom: cardBorder, left: cardBorder, right: cardBorder };
        for (const card of slide.cards) {
          const cardChildren = card.paragraphs.map((p, i) => {
            const opts = {
              spacing: { before: 10, after: 10 },
              children: [new TextRun({
                text: p.text,
                font: "Calibri",
                size: 20,
                bold: i === 0,
              })]
            };
            if (p.bullet) {
              opts.numbering = { reference: "bullets", level: 0 };
            } else if (p.autonum) {
              opts.numbering = { reference: "numbers", level: 0 };
            }
            return new Paragraph(opts);
          });
          children.push(new Table({
            width: { size: 10080, type: WidthType.DXA },
            columnWidths: [10080],
            rows: [new TableRow({
              children: [new TableCell({
                borders: cardBorders,
                shading: { fill: "FAFAFA", type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 120, right: 120 },
                width: { size: 10080, type: WidthType.DXA },
                children: cardChildren
              })]
            })]
          }));
        }
      } else {
        // Flat body text — no cards or tables detected
        for (const shape of slide.body_shapes) {
          for (const para of shape.paragraphs) {
            children.push(bodyPara(para));
          }
        }
      }
    }

    // Speaker Notes section — in a shaded box
    if (slide.speaker_notes.length > 0) {
      const notesLabel = new Paragraph({
        spacing: { before: 0, after: 40 },
        children: [new TextRun({
          text: "Speaker Notes", bold: true, font: "Calibri", size: 22, color: "555555"
        })]
      });
      const notesParagraphs = slide.speaker_notes.map(para =>
        new Paragraph({
          spacing: { before: 20, after: 20 },
          children: [new TextRun({ text: para, font: "Calibri", size: 20 })]
        })
      );
      const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
      const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
      children.push(new Table({
        width: { size: 10080, type: WidthType.DXA },
        columnWidths: [10080],
        rows: [new TableRow({
          children: [new TableCell({
            borders: noBorders,
            shading: { fill: "F0F4F8", type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 160, right: 160 },
            width: { size: 10080, type: WidthType.DXA },
            children: [notesLabel, ...notesParagraphs]
          })]
        })]
      }));
    }
  }

  // Page break after each slide except the last
  if (!isLast) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  return children;
}

// Build all slide content
const allChildren = [];
data.slides.forEach((slide, i) => {
  const isLast = i === data.slides.length - 1;
  allChildren.push(...buildSlideSection(slide, isLast));
});

const doc = new Document({
  title: `${data.deck_name} \u2014 Text Edit Document`,
  creator: "Shockproof AI",
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
      {
        reference: "numbers",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      }
    ]
  },
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 20 } }
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Calibri", color: "1A4FE8" },
        paragraph: { spacing: { before: 0, after: 60 }, outlineLevel: 0 }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Calibri", color: "B85042" },
        paragraph: { spacing: { before: 120, after: 40 }, outlineLevel: 1 }
      }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          children: [
            new TextRun({ text: data.deck_name, font: "Calibri", size: 16, color: "888888" }),
            new TextRun({ text: "\tText Edit Document", font: "Calibri", size: 16, color: "888888" })
          ]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Page ", font: "Calibri", size: 16, color: "888888" }),
            new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 16, color: "888888" })
          ]
        })]
      })
    },
    children: allChildren
  }]
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outputPath, buffer);
console.log(`Generated: ${outputPath}`);
