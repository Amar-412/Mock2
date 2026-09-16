import Evaluation from '../models/evaluation.model.js';
import Team from '../models/team.model.js';
import College from '../models/college.model.js';

export async function getLeaderboardData(eventId) {
  const evaluations = await Evaluation.find({ eventId }).populate('teamId').populate('taskId').lean();

  const teamMap = new Map();
  for (const item of evaluations) {
    const teamId = String(item.teamId?._id || item.teamId);
    if (!teamMap.has(teamId)) {
      teamMap.set(teamId, { teamId, teamName: item.teamId?.name || 'Unknown', collegeId: item.teamId?.collegeId, totalScore: 0, submissions: 0 });
    }
    const bucket = teamMap.get(teamId);
    bucket.totalScore += Number(item.totalScore || 0);
    bucket.submissions += 1;
  }

  const teamLeaderboard = [...teamMap.values()].map((entry) => ({
    team: entry.teamName,
    teamId: entry.teamId,
    collegeId: entry.collegeId,
    score: entry.totalScore,
    submissions: entry.submissions,
  })).sort((a, b) => b.score - a.score);

  const colleges = await College.find({}).lean();
  const collegeLeaderboard = colleges.map((college) => {
    const teamEntries = teamLeaderboard.filter((entry) => String(entry.collegeId) === String(college._id));
    const score = teamEntries.reduce((sum, item) => sum + Number(item.score || 0), 0);
    return {
      college: college.name,
      collegeId: college._id,
      teams: teamEntries.length,
      score,
    };
  }).sort((a, b) => b.score - a.score);

  return { teamLeaderboard, collegeLeaderboard };
}
