/**
 * Security Results Processor for Jest
 * Processes test results with security focus
 */

const fs = require('fs');
const path = require('path');

module.exports = (results) => {
  const securityTestResults = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: results.numTotalTests,
      passedTests: results.numPassedTests,
      failedTests: results.numFailedTests,
      securityTests: 0,
      vulnerabilityTests: 0,
      securityCoverage: 0
    },
    securityFindings: [],
    coverageReport: null,
    recommendations: []
  };

  // Process test results for security-specific information
  results.testResults.forEach(testResult => {
    testResult.assertionResults.forEach(assertion => {
      // Count security-related tests
      if (assertion.title.toLowerCase().includes('security') ||
          assertion.title.toLowerCase().includes('vulnerability') ||
          assertion.title.toLowerCase().includes('xss') ||
          assertion.title.toLowerCase().includes('csrf') ||
          assertion.title.toLowerCase().includes('injection')) {
        securityTestResults.summary.securityTests++;
      }

      if (assertion.title.toLowerCase().includes('vulnerability')) {
        securityTestResults.summary.vulnerabilityTests++;
      }

      // Track security test failures
      if (assertion.status === 'failed' && 
          (assertion.title.toLowerCase().includes('security') ||
           assertion.title.toLowerCase().includes('vulnerability'))) {
        securityTestResults.securityFindings.push({
          test: assertion.title,
          file: testResult.testFilePath,
          error: assertion.failureMessages.join('\n'),
          severity: determineSeverity(assertion.title, assertion.failureMessages)
        });
      }
    });
  });

  // Calculate security coverage
  if (results.coverageMap) {
    const securityFiles = ['security-manager.js', 'audio-manager.js', 'security-functions.php'];
    let totalSecurityLines = 0;
    let coveredSecurityLines = 0;

    Object.keys(results.coverageMap.data).forEach(filePath => {
      const fileName = path.basename(filePath);
      if (securityFiles.some(secFile => fileName.includes(secFile.split('.')[0]))) {
        const fileCoverage = results.coverageMap.data[filePath];
        if (fileCoverage.s) {
          totalSecurityLines += Object.keys(fileCoverage.s).length;
          coveredSecurityLines += Object.values(fileCoverage.s).filter(hits => hits > 0).length;
        }
      }
    });

    if (totalSecurityLines > 0) {
      securityTestResults.summary.securityCoverage = 
        Math.round((coveredSecurityLines / totalSecurityLines) * 100);
    }
  }

  // Generate security recommendations
  securityTestResults.recommendations = generateSecurityRecommendations(securityTestResults);

  // Write security report
  const reportPath = path.join(process.cwd(), 'coverage', 'security-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(securityTestResults, null, 2));

  // Generate security summary for console
  console.log('\n🔒 SECURITY TEST SUMMARY');
  console.log('========================');
  console.log(`Security Tests: ${securityTestResults.summary.securityTests}`);
  console.log(`Vulnerability Tests: ${securityTestResults.summary.vulnerabilityTests}`);
  console.log(`Security Coverage: ${securityTestResults.summary.securityCoverage}%`);
  console.log(`Security Findings: ${securityTestResults.securityFindings.length}`);

  if (securityTestResults.securityFindings.length > 0) {
    console.log('\n⚠️  SECURITY FINDINGS:');
    securityTestResults.securityFindings.forEach(finding => {
      console.log(`  ${finding.severity}: ${finding.test}`);
    });
  }

  if (securityTestResults.recommendations.length > 0) {
    console.log('\n💡 SECURITY RECOMMENDATIONS:');
    securityTestResults.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });
  }

  console.log(`\n📄 Detailed security report: ${reportPath}\n`);

  return results;
};

function determineSeverity(title, failureMessages) {
  const highSeverityKeywords = ['vulnerability', 'injection', 'xss', 'csrf', 'authentication'];
  const mediumSeverityKeywords = ['validation', 'sanitization', 'headers', 'rate limit'];
  
  const content = (title + ' ' + failureMessages.join(' ')).toLowerCase();
  
  if (highSeverityKeywords.some(keyword => content.includes(keyword))) {
    return 'HIGH';
  } else if (mediumSeverityKeywords.some(keyword => content.includes(keyword))) {
    return 'MEDIUM';
  } else {
    return 'LOW';
  }
}

function generateSecurityRecommendations(results) {
  const recommendations = [];
  
  if (results.summary.securityCoverage < 90) {
    recommendations.push('Increase security test coverage to at least 90%');
  }
  
  if (results.securityFindings.some(f => f.severity === 'HIGH')) {
    recommendations.push('Address high-severity security findings immediately');
  }
  
  if (results.summary.vulnerabilityTests < 10) {
    recommendations.push('Add more vulnerability-specific tests');
  }
  
  if (results.summary.securityTests < results.summary.totalTests * 0.3) {
    recommendations.push('Increase proportion of security-focused tests');
  }
  
  return recommendations;
}