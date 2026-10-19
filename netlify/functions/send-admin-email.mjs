const json=(statusCode,body)=>({statusCode,headers:{"content-type":"application/json","cache-control":"no-store"},body:JSON.stringify(body)});
const esc=value=>String(value||"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));

export const handler=async event=>{
  if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
  const apiKey=process.env.RESEND_API_KEY;
  const from=process.env.MYMEDDOSE_EMAIL_FROM;
  const appUrl=process.env.URL||"https://mymeddose.netlify.app";
  if(!apiKey||!from)return json(503,{error:"MyMedDose email is not configured yet."});
  let input;
  try{input=JSON.parse(event.body||"{}")}catch{return json(400,{error:"Invalid request"})}
  const to=String(input.to||"").trim().toLowerCase();
  const type=String(input.type||"");
  if(!/^\S+@\S+\.\S+$/.test(to))return json(400,{error:"A valid recipient email is required."});
  let subject="MyMedDose administrator access",html="";
  if(type==="admin-invite"){
    subject="You have been invited to MyMedDose";
    html=`<h2>MyMedDose administrator access</h2><p>You have been authorized to use the MyMedDose medication governance dashboard.</p><p><a href="${esc(appUrl)}/admin">Open MyMedDose Admin</a></p><p>Use this email address to create your approved administrator account.</p>`;
  }else if(type==="password-reset-notice"){
    subject="MyMedDose password reset requested";
    html=`<h2>Password reset requested</h2><p>A password reset was requested for your MyMedDose administrator account.</p><p><a href="${esc(appUrl)}/admin">Open MyMedDose Admin</a> and choose <strong>Forgot password?</strong> to complete the secure reset.</p><p>If you did not request this, contact your MyMedDose administrator.</p>`;
  }else return json(400,{error:"Unsupported email type"});
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:[to],subject,html})});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)return json(502,{error:payload?.message||"Email provider rejected the message."});
  return json(200,{ok:true,id:payload.id||null});
};
