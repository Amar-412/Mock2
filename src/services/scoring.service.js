export function calculateTotalScore(criteria = []) {
  return criteria.reduce((sum, item) => {
    const numericScore = Number(item.score ?? 0);
    return sum + (Number.isFinite(numericScore) ? numericScore : 0);
  }, 0);
}

export function validateCriteria(criteria = [], taskMaxScore = 0) {
  if (!Array.isArray(criteria)) {
    throw new Error('Criteria must be an array');
  }

  for (const item of criteria) {
    if (typeof item.score !== 'number' || Number.isNaN(item.score)) {
      throw new Error(`Invalid score for ${item.name || 'criterion'}`);
    }

    if (item.score < 0 || item.score > Number(item.maxScore || 0)) {
      throw new Error(`Score for ${item.name || 'criterion'} must be between 0 and ${item.maxScore}`);
    }
  }

  const total = calculateTotalScore(criteria);
  if (taskMaxScore && total > taskMaxScore) {
    throw new Error('Total score exceeds task maximum');
  }

  return total;
}
