export type AssessmentCheck = { id:string; label:string; passed:boolean; evidence:string; recommendation:string };
export type Assessment = { url:string; checkedAt:string; score:number; summary:string; categories:{id:string;label:string;score:number;checks:AssessmentCheck[]}[]; limitations:string[] };
export function analyzeHtml(input?: {html?:string;url?:string;status?:number;elapsedMs?:number}): Assessment;
