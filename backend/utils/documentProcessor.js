const fs = require('fs');
const path = require('path');
const util = require('util');
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { createFolderIfNotExists } = require('./fileUtils');

// Set up Gemini API
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    createFolderIfNotExists(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Use a unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// File filter to accept only specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, TXT, and DOCX files are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB file size limit
  }
});

// Utility functions to extract text from different document types
async function extractTextFromPdf(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

async function extractTextFromDocx(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error('Failed to extract text from DOCX');
  }
}

async function extractTextFromTxt(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error('Error reading TXT file:', error);
    throw new Error('Failed to read TXT file');
  }
}

// Extract text from uploaded document based on its type
async function extractTextFromDocument(file) {
  try {
    const filePath = file.path;
    const mimeType = file.mimetype;

    switch (mimeType) {
      case 'application/pdf':
        return await extractTextFromPdf(filePath);
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await extractTextFromDocx(filePath);
      case 'text/plain':
        return await extractTextFromTxt(filePath);
      default:
        throw new Error('Unsupported file type');
    }
  } catch (error) {
    console.error('Error extracting text:', error);
    throw error;
  }
}

// Generate quiz questions from document text using Gemini AI
async function generateQuizFromText(text, title, numQuestions = 10) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const generationConfig = {
      temperature: 0.8,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    };

    const prompt = `
Create a multiple-choice quiz based on the following text. 
Generate ${numQuestions} questions with 4 options each. 
Format each question as a JSON object with:
- question: The question text
- options: An array of 4 possible answers
- correctOption: The index (0-3) of the correct answer

Make sure questions cover key concepts and are challenging but fair.
The quiz is about: ${title}

Here's the text to base the quiz on:
${text.substring(0, 15000)} // Limiting to 15000 chars to avoid token limits

Respond with valid JSON in this format:
{
  "questions": [
    {
      "question": "Question text here",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctOption": 0
    },
    // more questions...
  ]
}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    });

    const response = result.response;
    const responseText = response.text();
    
    // Extract JSON from response text
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response as JSON');
    }
    
    const jsonContent = JSON.parse(jsonMatch[0]);
    return jsonContent.questions;
  } catch (error) {
    console.error('Error generating quiz with AI:', error);
    throw new Error('Failed to generate quiz questions');
  }
}

module.exports = {
  upload,
  extractTextFromDocument,
  generateQuizFromText
};