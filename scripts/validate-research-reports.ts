import {
  ResearchCorpusValidationError,
  validateResearchReports,
} from "../server/researchReports";

try {
  await validateResearchReports();
  console.log("Research corpus validation passed.");
} catch (error) {
  if (error instanceof ResearchCorpusValidationError) {
    console.error(error.message);
    for (const detail of error.details) {
      console.error(`- ${detail}`);
    }
  } else {
    console.error(error);
  }
  process.exitCode = 1;
}
