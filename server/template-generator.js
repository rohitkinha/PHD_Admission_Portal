const excel = require("excel4node");
const pool = require("./db");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");

dotenv.config();

async function generate_applications_in_excel(info) {
  const workbook = new excel.Workbook();
  const style = workbook.createStyle({
    font: { color: "#000000", size: 11 },
  });

  const header_style = workbook.createStyle({
    font: { color: "#ffffff", size: 10 },
    fill: { type: "pattern", patternType: "solid", fgColor: "365e9e" },
    border: { outline: true },
  });

  const link_style = workbook.createStyle({
    font: { color: "#0000EE", size: 10 },
  });

  const worksheet = workbook.addWorksheet("Sheet 1");

  /** For excel to keep track of rows */
  let rowCount = 1;

  /** Get column list */
  const template = await pool.query(
    "SELECT * from templates WHERE template_id = $1;",
    [info.template_id]
  );
  let column_list = template.rows[0].column_list;

  /** Header list */
  let header_list = column_list.slice();

  /** Put degrees at the end */
  let index = header_list.indexOf("degrees");
  if (index > -1) {
    header_list.splice(index, 1);
    column_list.splice(index, 1); /** Remove from column_list also */

    for (var i = 1; i <= 5; i++) {
      header_list.push("degree_" + i);
      header_list.push("branch_" + i);
      header_list.push("institute/university_" + i);
      header_list.push("year_of_passing_" + i);
      header_list.push("percentage/cgpa_format_" + i);
      header_list.push("percentage/cgpa_" + i);
      header_list.push("cgpa_scale_" + i);
      header_list.push("remarks_" + i);
      header_list.push("marksheets_url_" + i);
      header_list.push("degree_url_" + i);
    }
  }

  /** Write header */
  header_list.forEach((element, columnIndex) => {
    worksheet
      .cell(rowCount, columnIndex + 1)
      .string(element.replaceAll("_", " ").toUpperCase())
      .style(header_style);
  });
  rowCount++;

  /** Get applications */
  const applications = await pool.query(
    "SELECT * FROM applications_" + info.cycle_id + " WHERE offering_id = $1;",
    [info.offering_id]
  );

  /** All applications */
  let data = applications.rows;

  /** Number fields */
  let number_fields = [
    "application_id",
    "percentage_cgpa_value_10th",
    "year_of_passing_10th",
    "percentage_cgpa_value_12th",
    "year_of_passing_12th",
    "amount",
    "year",
    "all_india_rank",
    "gate_score",
    "valid_upto",
  ];

  /** Link fields */
  let link_fields = [
    "profile_image_url",
    "category_certificate_url",
    "marksheet_10th_url",
    "marksheet_12th_url",
    "self_attested_copies_url",
    "signature_url",
    'noc_pdf',
    'sop_pdf',
    'letter_pi_pdf',
    'exam_result_pdf',
    'publications_pdf'
  ];

  /** Write data */
  data.forEach((element, rowIndex) => {
    let columnIndex = 1;
    for (var i = 0; i < column_list.length; i++) {
      if (
        element[column_list[i]] !== null &&
        element[column_list[i]] != "null" && 
        element[column_list[i]] !== "undefined"
      ) {
        if (number_fields.indexOf(column_list[i]) > -1) {
          worksheet
            .cell(rowCount, columnIndex)
            .number(+element[column_list[i]])
            .style(style);

            
        } else if (link_fields.indexOf(column_list[i]) > -1) {
          worksheet
            .cell(rowCount, columnIndex)
            .link(element[column_list[i]])
            .style(link_style);

        } else {
          worksheet
            .cell(rowCount, columnIndex)
            .string(String(element[column_list[i]]))
            .style(style);        
        }
      }
      columnIndex++;
    }
    rowCount++;
  });

  /** Write timestamp */
  worksheet
    .cell(rowCount + 1, 1)
    .string("Generated by IIT Ropar Admission Portal at " + new Date())
    .style(style);

  /** Return */
  return workbook;
}

const get_applications_in_excel = async (req, res) => {
  /**
   * Verify using authToken
   */

  authToken = req.headers.authorization;
  let jwtSecretKey = process.env.JWT_SECRET_KEY;

  var verified = null;

  try {
    verified = jwt.verify(authToken, jwtSecretKey);
  } catch (error) {
    return res.send("1"); /** Error, logout on user side */
  }

  if (!verified) {
    return res.send("1"); /** Error, logout on user side */
  }

  /** Get role */
  var userRole = jwt.decode(authToken).userRole;
  if (userRole !== 0 && userRole !== 1 && userRole !== 3) {
    return res.send("1");
  }

  let workbook = await generate_applications_in_excel(req.headers);
  workbook.write("Applicant_List.xlsx", res);
};

module.exports = {
  // generate_applications_in_excel,
  get_applications_in_excel,
};
