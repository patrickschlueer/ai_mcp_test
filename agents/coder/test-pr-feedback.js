import CoderAgent from './agent.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Test Script für PR-Feedback Analyse
 * 
 * Testet was der Coder Agent aus dem Review-Feedback extrahiert
 * und was er daraus macht
 */

async function testPRFeedbackAnalysis() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TEST: PR-Feedback Analyse');
  console.log('='.repeat(80));
  
  const coder = new CoderAgent();
  
  // Test mit PR #6
  const testPRNumber = 6;
  
  console.log(`\n📋 Step 1: Reading PR #${testPRNumber} feedback...`);
  console.log('─'.repeat(80));
  
  try {
    // Lese PR-Feedback
    const prFeedback = await coder.readPRFeedback(testPRNumber);
    
    console.log(`\n✅ PR Feedback gelesen!`);
    console.log('─'.repeat(80));
    
    // Zeige was extrahiert wurde
    console.log(`\n📊 ANALYSE ERGEBNIS:`);
    console.log('─'.repeat(80));
    
    console.log(`\n1️⃣ Review Decision: ${prFeedback.reviewDecision || 'NONE'}`);
    console.log(`2️⃣ Total Comments: ${prFeedback.comments.length}`);
    console.log(`3️⃣ Requested Changes: ${prFeedback.requestedChanges.length}`);
    
    if (prFeedback.requestedChanges.length > 0) {
      console.log(`\n📝 EXTRAHIERTE ISSUES (${prFeedback.requestedChanges.length}):`);
      console.log('─'.repeat(80));
      
      prFeedback.requestedChanges.forEach((issue, index) => {
        console.log(`\n[${index + 1}] ${issue.severity.toUpperCase()}`);
        console.log(`   📍 File: ${issue.file}`);
        console.log(`   📏 Line: ${issue.line}`);
        console.log(`   ❌ Problem: ${issue.problem}`);
        console.log(`   📋 Evidence: ${issue.evidence ? issue.evidence.substring(0, 100) + '...' : 'None'}`);
        console.log(`   ✅ Solution: ${issue.solution.substring(0, 150)}...`);
      });
      
      // Gruppiere nach Severity
      const critical = prFeedback.requestedChanges.filter(i => i.severity === 'critical');
      const major = prFeedback.requestedChanges.filter(i => i.severity === 'major');
      
      console.log(`\n📊 ZUSAMMENFASSUNG:`);
      console.log('─'.repeat(80));
      console.log(`   🚨 Critical: ${critical.length}`);
      console.log(`   ⚠️  Major: ${major.length}`);
      
      // Zeige welche Files betroffen sind
      const affectedFiles = [...new Set(prFeedback.requestedChanges.map(i => i.file))];
      console.log(`\n📁 BETROFFENE FILES (${affectedFiles.length}):`);
      affectedFiles.forEach(file => {
        const fileIssues = prFeedback.requestedChanges.filter(i => i.file === file);
        console.log(`   - ${file} (${fileIssues.length} issue(s))`);
      });
      
    } else {
      console.log(`\n⚠️  PROBLEM: Keine Issues extrahiert!`);
      console.log(`   Das bedeutet der Parser funktioniert nicht richtig.`);
    }
    
    // Zeige Raw Summary
    console.log(`\n📄 RAW REVIEW SUMMARY (erste 500 Zeichen):`);
    console.log('─'.repeat(80));
    console.log(prFeedback.summary.substring(0, 500));
    console.log('...');
    
    // Test: Was würde der Coder jetzt damit machen?
    console.log(`\n\n🔍 Step 2: Simuliere was Coder als nächstes tun würde...`);
    console.log('─'.repeat(80));
    
    if (prFeedback.requestedChanges.length > 0) {
      console.log(`\n✅ Der Coder würde jetzt folgende Änderungen vornehmen:`);
      
      const affectedFiles = [...new Set(prFeedback.requestedChanges.map(i => i.file))];
      
      prFeedback.requestedChanges.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.file}:${issue.line}`);
        console.log(`   Aktion: ${issue.solution.substring(0, 100)}...`);
      });
      
      console.log(`\n\n💡 EMPFEHLUNG:`);
      console.log('─'.repeat(80));
      console.log(`Der Coder sollte sich NUR auf diese ${prFeedback.requestedChanges.length} Issues konzentrieren:`);
      console.log(`Betroffene Files: ${affectedFiles.length}`);
      affectedFiles.forEach(file => console.log(`   - ${file}`));
      console.log(`\nUnd GENAU die vom Reviewer beschriebenen Lösungen implementieren.`);
      
    } else {
      console.log(`\n❌ FEHLER: Keine Änderungen extrahiert!`);
      console.log(`   Der Coder würde wahrscheinlich falsche Änderungen machen.`);
    }
    
    // Speichere Ergebnis als JSON für weitere Analyse
    console.log(`\n\n💾 Speichere Analyse-Ergebnis...`);
    const fs = await import('fs');
    fs.writeFileSync(
      'pr-feedback-analysis.json',
      JSON.stringify(prFeedback, null, 2)
    );
    console.log(`   ✅ Gespeichert: pr-feedback-analysis.json`);
    
    console.log('\n' + '='.repeat(80));
    console.log('🏁 Test abgeschlossen');
    console.log('='.repeat(80) + '\n');
    
    // Exit erfolgreich
    process.exit(0);
    
  } catch (error) {
    console.error(`\n❌ FEHLER: ${error.message}`);
    console.error(error.stack);
    
    console.log('\n' + '='.repeat(80));
    console.log('❌ Test fehlgeschlagen');
    console.log('='.repeat(80) + '\n');
    
    // Exit mit Fehler
    process.exit(1);
  }
}

// Run test
testPRFeedbackAnalysis().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
