import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

async function extractPdfText(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ").replace(/\\s+/g, " ").trim();
    if (text) pages.push(`Page ${pageNumber}: ${text}`);
    page.cleanup();
  }
  return pages.join("\\n\\n").trim();
}

async function extractKnowledgeText(file) {
  const ext = file.name.toLowerCase().split(".").pop() || "";
  if (ext === "pdf" || file.type === "application/pdf") return extractPdfText(file);
  if (["txt", "md", "csv", "json"].includes(ext) || file.type.startsWith("text/")) return (await file.text()).trim();
  return "";
}

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "https://dsvqneushvuunpjqookz.supabase.co",
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_gWqkaP6kIQ331xxFb3RF_A_Vkw9JqSq"
);

const agents = [
  "Sales SDR Automation",
  "Customer Support Bots",
  "Custom GPT Builds",
  "RAG Systems",
  "Voice Agents",
  "Workflow Automation",
];

function Chatbot({ businessId = "4f779903-738c-4dfe-bcc2-201ca06253f2", embedded = false }) {
  const [open,setOpen]=useState(false),[msg,setMsg]=useState("");
  const [items,setItems]=useState([{role:"ai",text:"Hi, I'm Orken AI. How can I help?"}]);
  const [isListening,setIsListening]=useState(false),[voiceError,setVoiceError]=useState("");
  const [contactOpen,setContactOpen]=useState(false),[leadMessage,setLeadMessage]=useState("");
  const [suggestedFaqs,setSuggestedFaqs]=useState([]);
  const recognitionRef=useRef(null),listeningRef=useRef(false);

  async function send(t=msg){
    const question=t.trim(); if(!question)return;
    setItems(x=>[...x,{role:"user",text:question},{role:"typing",text:"Typing..."}]); setMsg(""); setLeadMessage("");
    const typingDelay = new Promise(resolve => setTimeout(resolve, 2000));
    try{
      const {data,error}=await supabase.functions.invoke("chat-with-knowledge",{body:{message:question,history:items.slice(-6),business_id:businessId}});
      if(error)throw error;
      await typingDelay;
      if(data?.found===false||data?.fallback===true||!data?.answer){
        setItems(x=>[...x.filter(m=>m.role!=="typing"),{role:"ai",text:"I can only assist about Orken AI and its services. I couldn't find an answer to that question."}]);
        setContactOpen(true);
      }else setItems(x=>[...x.filter(m=>m.role!=="typing"),{role:"ai",text:data.answer}]);
    }catch(error){
      await typingDelay;
      setItems(x=>[...x.filter(m=>m.role!=="typing"),{role:"ai",text:"I’m unable to access the business knowledge right now."}]);
    }
  }
  async function submitLead(e){
    e.preventDefault(); const f=e.currentTarget;
    const {error}=await supabase.from("leads").insert({name:f.name.value.trim(),email:f.email.value.trim(),phone:f.whatsapp.value.trim()||null,message:f.subject.value.trim(),source:"Orken AI website chatbot human support",status:"new"});
    setLeadMessage(error?"Unable to submit right now. Please try again.":"Thank you. Our team will contact you.");
    if(!error)f.reset();
  }
  function startVoiceInput(){
    setVoiceError("");
    if(listeningRef.current){try{recognitionRef.current?.stop()}catch{};return}
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){setVoiceError("Voice input is not supported in this browser. Try Chrome or Edge.");return}
    try{
      const r=new SR(); r.lang="en-US"; r.continuous=false;r.interimResults=true;r.maxAlternatives=1;
      r.onstart=()=>{listeningRef.current=true;setIsListening(true)}; r.onresult=e=>{let t="";for(let i=e.resultIndex;i<e.results.length;i++)t+=e.results[i][0].transcript;setMsg(t.trim())};
      r.onerror=e=>{listeningRef.current=false;setIsListening(false);if(e.error!=="aborted")setVoiceError(e.error==="not-allowed"?"Microphone permission was blocked. Allow microphone access and try again.":"Voice input could not be started. Please try again.")};
      r.onend=()=>{listeningRef.current=false;setIsListening(false);recognitionRef.current=null}; recognitionRef.current=r;r.start();
    }catch{listeningRef.current=false;setIsListening(false);recognitionRef.current=null;setVoiceError("Voice input could not be started. Please try again.")}
  }
  useEffect(()=>{
    let active=true;
    supabase.from("faqs").select("id,question").order("created_at",{ascending:false}).limit(2).then(({data})=>{
      if(active) setSuggestedFaqs((data||[]).filter(faq=>faq.question?.trim()));
    });
    return ()=>{active=false};
  },[businessId]);
  useEffect(()=>{
    if(!embedded) return;
    const root=document.documentElement, body=document.body;
    const previousRoot=root.style.background;
    const previousBody=body.style.background;
    root.style.background="transparent";
    body.style.background="transparent";
    return ()=>{root.style.background=previousRoot;body.style.background=previousBody};
  },[embedded]);
  useEffect(()=>{
    if(!embedded || window.parent===window) return;
    window.parent.postMessage({type:"orken-chatbot-state",open},"*");
  },[embedded,open]);
  useEffect(()=>()=>{listeningRef.current=false;try{recognitionRef.current?.stop()}catch{};recognitionRef.current=null},[]);
  return <div className={embedded ? "chat embedded-chat" : "chat"}>
    <button className="launcher" onClick={()=>setOpen(!open)} aria-label="Open Orken AI chat"/>
    {open&&<div className="window">
      <header><b>Orken AI</b><span>GROQ-POWERED · LIVE</span></header>
      <main>{items.map((x,i)=><p key={i} className={x.role==="user"?"user-message":x.role==="typing"?"ai-message typing-message":"ai-message"}>{x.text}</p>)}</main>
      <div className="suggest">{suggestedFaqs.map(faq=><button key={faq.id} onClick={()=>send(faq.question)}>{faq.question}</button>)}</div>
      {contactOpen&&<div className="chat-contact">
        <div>Contact our team for human support</div>
        <form onSubmit={submitLead}>
          <input name="name" placeholder="Name" required/><input name="email" type="email" placeholder="Email" required/><input name="whatsapp" placeholder="WhatsApp (optional)"/><input name="subject" placeholder="Subject" required/>
          <div><button type="button" onClick={()=>setContactOpen(false)}>Close</button><button type="submit">Submit</button></div>
          {leadMessage&&<small>{leadMessage}</small>}
        </form>
      </div>}
      <form onSubmit={e=>{e.preventDefault();send()}}>
        <button type="button" className={`mic-icon${isListening?" listening":""}`} onClick={startVoiceInput} aria-label={isListening?"Stop microphone":"Use microphone"} title={isListening?"Stop listening":"Voice input"}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z"/><path d="M19 11a7 7 0 0 1-14 0M12 18v4M8 22h8"/></svg></button>
        <input value={msg} onChange={e=>setMsg(e.target.value)} placeholder={isListening?"Listening...":"Ask Orken AI..."} aria-label="Message"/>
        <button aria-label="Send message" className="send-icon" type="submit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3 10.5 13.5M21 3l-6.7 18-3.8-7.5L3 9.7 21 3Z"/></svg></button>
      </form>
      {voiceError&&<div className="voice-error">{voiceError}</div>}
    </div>}
  </div>
}
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) setError(authError.message);
    else onLogin(data.user);
    setLoading(false);
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-brand">ORKEN<span>AI</span></div>
        <div className="auth-label">ADMIN ACCESS</div>
        <h1>Sign in to your dashboard.</h1>
        <p>Use the email and password created for you in Supabase.</p>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
        {error && <div className="auth-error">{error}</div>}
        <button className="auth-submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
        <a href="/" className="back-link">← Back to website</a>
      </form>
    </div>
  );
}

function AdminDashboard({ user, onLogout }) {
  const [section, setSection] = useState("overview");
  const [profile, setProfile] = useState({ full_name: "", email: user.email || "", portfolio_image_url: "" });
  const [leads, setLeads] = useState([]);
  const [docs, setDocs] = useState([]);
  const [faqs, setFaqs] = useState([]);
const [services, setServices] = useState([]);
  const [customDetails, setCustomDetails] = useState([]);
  const [customDetailForm, setCustomDetailForm] = useState({ id: null, file_name: "", content: "" });
  const [customDetailEditorOpen, setCustomDetailEditorOpen] = useState(false);
const [serviceForm, setServiceForm] = useState({ id: null, name: "", description: "" });
  const [faqForm, setFaqForm] = useState({ id: null, question: "", answer: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);

  async function loadDashboard() {
    const [{ data: p }, { data: l }, { data: d }, { data: f }, { data: s }, { data: cd }] = await Promise.all([
      supabase.from("profiles").select("full_name,portfolio_image_url").eq("id", user.id).single(),
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("knowledge_documents").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("faqs").select("*").order("created_at", { ascending: false }),
supabase.from("services").select("*").order("created_at", { ascending: false }),
      supabase.from("custom_details").select("*").order("created_at", { ascending: false }),
    ]);
    setProfile({ full_name: p?.full_name || "", email: user.email || "", portfolio_image_url: p?.portfolio_image_url || "" });
    setLeads(l || []);
    setDocs(d || []);
    setFaqs(f || []);
    setServices(s || []);
    setCustomDetails(cd || []);
  }

  useEffect(() => { loadDashboard(); }, [user.id]);

  async function uploadPortfolioImage(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith("image/")) { setMessage("Please select an image file."); return; }
    if (selected.size > 5 * 1024 * 1024) { setMessage("Please choose an image smaller than 5 MB."); return; }
    setSaving(true); setMessage("");
    const ext = selected.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/profile.${ext}`;
    const { error: uploadError } = await supabase.storage.from("portfolio-images").upload(path, selected, { contentType: selected.type, upsert: true, cacheControl: "3600" });
    if (uploadError) { setMessage(uploadError.message); setSaving(false); return; }
    const { data: urlData } = supabase.storage.from("portfolio-images").getPublicUrl(path);
    const imageUrl = urlData.publicUrl;
    const { error: profileError } = await supabase.from("profiles").update({ portfolio_image_url: imageUrl, updated_at: new Date().toISOString() }).eq("id", user.id);
    if (profileError) { setMessage(profileError.message); setSaving(false); return; }
    setProfile((p) => ({ ...p, portfolio_image_url: imageUrl }));
    setMessage("Portfolio image updated.");
    setSaving(false);
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("profiles").update({ full_name: profile.full_name, updated_at: new Date().toISOString() }).eq("id", user.id);
    setMessage(error ? error.message : "Profile saved.");
    setSaving(false);
  }

  async function uploadFile(e) {
    e.preventDefault();
    if (!file) return;
    setSaving(true);
    setMessage("");
    let uploadFileObject = file;

    // Compress images automatically to a maximum of 80 KB.
    // Documents are uploaded unchanged because lossy image compression does not apply to them.
    if (file.type.startsWith("image/")) {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const maxDimension = 1800;
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      let quality = 0.82;
      let blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      while (blob && blob.size > 80 * 1024 && quality > 0.1) {
        quality -= 0.07;
        blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      }

      if (blob && blob.size <= 80 * 1024) {
        uploadFileObject = new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
      } else {
        setMessage("This image could not be compressed to 80 KB. Please choose a smaller image.");
        setSaving(false);
        return;
      }
    }

    try {
      const knowledgeText = await extractKnowledgeText(uploadFileObject);
      if (!knowledgeText) throw new Error("No readable text was found in this file. The PDF may be scanned/image-only.");
      if (knowledgeText.length > 500000) throw new Error("This file contains too much text. Please split it into smaller files.");

      const safeName = uploadFileObject.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = user.id + "/" + Date.now() + "-" + safeName;
      const { error: uploadError } = await supabase.storage.from("knowledge-documents").upload(path, uploadFileObject, { upsert: false });
      if (uploadError) throw uploadError;

      const { error: rowError } = await supabase.from("knowledge_documents").insert({
        user_id: user.id,
        file_name: uploadFileObject.name,
        file_path: path,
        file_type: uploadFileObject.type || "unknown",
        file_size: uploadFileObject.size,
        content: knowledgeText,
      });

      if (rowError) {
        await supabase.storage.from("knowledge-documents").remove([path]);
        throw rowError;
      }

      setMessage(`File uploaded and indexed: ${knowledgeText.length.toLocaleString()} characters.`);
    } catch (error) {
      setMessage(error?.message || "The file could not be processed.");
    }

    setFile(null);
    e.target.reset();
    await loadDashboard();
    setSaving(false);
  }

  async function reindexDoc(doc) {
    setSaving(true);
    setMessage("");
    try {
      const { data, error } = await supabase.storage.from("knowledge-documents").download(doc.file_path);
      if (error || !data) throw error || new Error("Could not download the stored file.");
      const knowledgeText = await extractKnowledgeText(new File([data], doc.file_name, { type: doc.file_type || data.type }));
      if (!knowledgeText) throw new Error("No readable text was found. The PDF may be scanned/image-only.");
      const { error: updateError } = await supabase.from("knowledge_documents").update({ content: knowledgeText }).eq("id", doc.id).eq("user_id", user.id);
      if (updateError) throw updateError;
      setMessage(`Knowledge indexed successfully: ${knowledgeText.length.toLocaleString()} characters.`);
    } catch (error) {
      setMessage(error?.message || "The file could not be indexed.");
    }
    await loadDashboard();
    setSaving(false);
  }

  async function deleteDoc(doc) {
    setSaving(true);
    await supabase.storage.from("knowledge-documents").remove([doc.file_path]);
    await supabase.from("knowledge_documents").delete().eq("id", doc.id);
    await loadDashboard();
    setSaving(false);
  }

  async function saveFaq(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const payload = { question: faqForm.question.trim(), answer: faqForm.answer.trim(), updated_at: new Date().toISOString() };
    const result = faqForm.id
      ? await supabase.from("faqs").update(payload).eq("id", faqForm.id)
      : await supabase.from("faqs").insert(payload);
    setMessage(result.error ? result.error.message : faqForm.id ? "FAQ updated." : "FAQ added.");
    if (!result.error) setFaqForm({ id: null, question: "", answer: "" });
    await loadDashboard();
    setSaving(false);
  }

  async function saveService(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const payload = { name: serviceForm.name.trim(), description: serviceForm.description.trim(), updated_at: new Date().toISOString() };
    const result = serviceForm.id
      ? await supabase.from("services").update(payload).eq("id", serviceForm.id)
      : await supabase.from("services").insert(payload);
    setMessage(result.error ? result.error.message : serviceForm.id ? "Service updated." : "Service added.");
    if (!result.error) setServiceForm({ id: null, name: "", description: "" });
    await loadDashboard();
    setSaving(false);
  }

  async function deleteService(id) {
    setSaving(true);
    const { error } = await supabase.from("services").delete().eq("id", id);
    setMessage(error ? error.message : "Service deleted.");
    await loadDashboard();
    setSaving(false);
  }

  async function saveCustomDetail(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const payload = { file_name: customDetailForm.file_name.trim(), content: customDetailForm.content.trim(), updated_at: new Date().toISOString() };
    const result = customDetailForm.id
      ? await supabase.from("custom_details").update(payload).eq("id", customDetailForm.id).eq("user_id", user.id)
      : await supabase.from("custom_details").insert({ ...payload, user_id: user.id });
    setMessage(result.error ? result.error.message : customDetailForm.id ? "Custom details updated." : "Custom details saved.");
    if (!result.error) { setCustomDetailForm({ id: null, file_name: "", content: "" }); setCustomDetailEditorOpen(false); } setCustomDetailEditorOpen(false);
    await loadDashboard();
    setSaving(false);
  }

  async function deleteCustomDetail(id) {
    setSaving(true);
    const { error } = await supabase.from("custom_details").delete().eq("id", id).eq("user_id", user.id);
    setMessage(error ? error.message : "Custom details deleted.");
    await loadDashboard();
    setSaving(false);
  }

  async function deleteFaq(id) {
    setSaving(true);
    const { error } = await supabase.from("faqs").delete().eq("id", id);
    setMessage(error ? error.message : "FAQ deleted.");
    await loadDashboard();
    setSaving(false);
  }

  async function deleteLead(id) {
    setSaving(true);
    const { error } = await supabase.from("leads").delete().eq("id", id);
    setMessage(error ? error.message : "Lead deleted.");
    await loadDashboard();
    setSaving(false);
  }

  function logout() {
    supabase.auth.signOut();
    onLogout();
  }

  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.status === "new").length;
  const [embedCopied, setEmbedCopied] = useState(false);
  const embedCode = `<script
  src="https://orken-ai-ashy.vercel.app/chatbot.js"
  data-business-id="${user.id}"
  defer>
</script>`;

  async function copyEmbedCode() {
    try {
      await navigator.clipboard.writeText(embedCode);
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 1800);
    } catch {
      setMessage("Unable to copy embed code. Please copy it manually.");
    }
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="dashboard-logo">ORKEN<span>AI</span></div>
        <div className="sidebar-label">ADMIN PANEL</div>
        <a className="back-to-website" href="/">← Back to website</a>
        <button className={section === "overview" ? "active" : ""} onClick={() => setSection("overview")}>Overview</button>
        <button className={section === "leads" ? "active" : ""} onClick={() => setSection("leads")}>Lead Generation</button>
        <button className={section === "data" ? "active" : ""} onClick={() => setSection("data")}>Add Data</button>
        <button className={section === "faqs" ? "active" : ""} onClick={() => setSection("faqs")}>FAQs</button>
<button className={section === "services" ? "active" : ""} onClick={() => setSection("services")}>Add Services</button>
        <button className={section === "custom" ? "active" : ""} onClick={() => setSection("custom")}>Custom Details</button>
        <button className={section === "profile" ? "active" : ""} onClick={() => setSection("profile")}>Profile Settings</button>
        <button className="logout" onClick={logout}>Sign out</button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div><span>ADMIN DASHBOARD</span><h1>{section === "overview" ? "Overview" : section === "leads" ? "Lead Generation" : section === "data" ? "Knowledge Data" : section === "faqs" ? "FAQs" : section === "services" ? "Services" : section === "custom" ? "Custom Details" : "Profile Settings"}</h1></div>
          <div className="dashboard-user">{profile.full_name || user.email}</div>
        </header>

        {section === "overview" && (
          <div className="dashboard-grid">
            <div className="stat-card"><span>TOTAL LEADS</span><b>{totalLeads}</b></div>
            <div className="stat-card"><span>NEW LEADS</span><b>{newLeads}</b></div>
            <div className="stat-card"><span>KNOWLEDGE FILES</span><b>{docs.length}</b></div>
            <div className="panel"><span className="panel-label">ACCOUNT</span><h2>Admin account active</h2><p>{user.email}</p><p>Connected to the Orken AI Supabase project.</p></div>
            <div className="panel embed-code-panel">
              <div className="panel-top"><div><span className="panel-label">AI CHAT BOT</span><h2>Embed Code</h2></div></div>
              <p>Add the Orken AI chatbot to your website by copying the code below and placing it before the closing <code>&lt;/body&gt;</code> tag.</p>
              <pre className="embed-code">{embedCode}</pre>
              <button className="embed-copy-btn" onClick={copyEmbedCode}>{embedCopied ? "Copied!" : "Copy Embed Code"}</button>
            </div>
          </div>
        )}

        {section === "leads" && (
          <div className="panel">
            <div className="panel-top"><div><span className="panel-label">CUSTOMER INQUIRIES</span><h2>Lead Generation</h2></div><b>{leads.length} leads</b></div>
            {leads.length === 0 ? <p className="empty">No leads yet.</p> : (
              <div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Message</th><th>Status</th><th>Date</th><th>Time</th><th>Action</th></tr></thead>
                <tbody>{leads.map((lead) => { const created = new Date(lead.created_at); return <tr key={lead.id}><td>{lead.name}</td><td>{lead.email || "—"}</td><td>{lead.phone || "—"}</td><td>{lead.message || "—"}</td><td><span className="status-pill">{lead.status}</span></td><td>{created.toLocaleDateString()}</td><td>{created.toLocaleTimeString()}</td><td><button className="delete-btn" onClick={() => deleteLead(lead.id)} disabled={saving}>Delete</button></td></tr>})}</tbody>
              </table></div>
            )}
          </div>
        )}

        {section === "data" && (
          <div className="data-layout">
            <div className="panel"><span className="panel-label">KNOWLEDGE BASE</span><h2>Add business data</h2><p>Upload PDF, TXT, MD, CSV, or JSON files. Text is extracted in the browser and added to the AI knowledge base automatically.</p>
              <form className="upload-form" onSubmit={uploadFile}><input type="file" accept=".pdf,.txt,.md,.csv,.json" onChange={(e) => setFile(e.target.files?.[0] || null)} required /><button className="auth-submit" disabled={saving}>{saving ? "Uploading..." : "Upload file"}</button></form>
              {message && <p className="form-message">{message}</p>}
            </div>
            <div className="panel"><span className="panel-label">UPLOADED FILES</span><h2>Your files</h2>{docs.length === 0 ? <p className="empty">No files uploaded.</p> : <div className="doc-list">{docs.map((doc) => <div className="doc-row" key={doc.id}><div><b>{doc.file_name}</b><small>{doc.file_type} · {Math.round(doc.file_size / 1024)} KB · {doc.content ? `${doc.content.length.toLocaleString()} chars indexed` : "not indexed"}</small></div><div className="faq-actions"><button className="edit-btn" disabled={saving} onClick={() => reindexDoc(doc)}>Re-index</button><button className="delete-btn" disabled={saving} onClick={() => deleteDoc(doc)}>Delete</button></div></div>)}</div>}</div>
          </div>
        )}

        {section === "faqs" && (
          <div className="data-layout">
            <div className="panel">
              <span className="panel-label">{faqForm.id ? "EDIT FAQ" : "ADD FAQ"}</span>
              <h2>{faqForm.id ? "Edit FAQ" : "Create a FAQ"}</h2>
              <form className="profile-panel" onSubmit={saveFaq}>
                <label>Question<input value={faqForm.question} onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })} placeholder="e.g. What services do you provide?" required /></label>
                <label>Answer<textarea value={faqForm.answer} onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })} placeholder="Write the answer..." rows="6" required /></label>
                <div className="faq-actions">
                  <button className="auth-submit" disabled={saving}>{saving ? "Saving..." : faqForm.id ? "Update FAQ" : "Add FAQ"}</button>
                  {faqForm.id && <button type="button" className="delete-btn" onClick={() => setFaqForm({ id: null, question: "", answer: "" })}>Cancel</button>}
                </div>
              </form>
              {message && <p className="form-message">{message}</p>}
            </div>
            <div className="panel">
              <span className="panel-label">FAQ KNOWLEDGE</span>
              <h2>Saved FAQs</h2>
              {faqs.length === 0 ? <p className="empty">No FAQs added yet.</p> : <div className="doc-list">{faqs.map((faq) => (
                <div className="doc-row faq-row" key={faq.id}>
                  <div><b>{faq.question}</b><small>{faq.answer}</small></div>
                  <div className="faq-actions"><button className="edit-btn" onClick={() => setFaqForm({ id: faq.id, question: faq.question, answer: faq.answer })}>Edit</button><button className="delete-btn" onClick={() => deleteFaq(faq.id)}>Delete</button></div>
                </div>
              ))}</div>}
            </div>
          </div>
        )}

        {section === "services" && <div className="data-layout"><div className="panel"><span className="panel-label">{serviceForm.id ? "EDIT SERVICE" : "ADD SERVICE"}</span><h2>{serviceForm.id ? "Edit service" : "Add a service"}</h2><form className="profile-panel" onSubmit={saveService}><label>Service name<input value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} placeholder="e.g. AI Customer Support" required /></label><label>Description<textarea value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} placeholder="Describe what this service provides..." rows="6" required /></label><div className="faq-actions"><button className="auth-submit" disabled={saving}>{saving ? "Saving..." : serviceForm.id ? "Update Service" : "Add Service"}</button>{serviceForm.id && <button type="button" className="delete-btn" onClick={() => setServiceForm({ id: null, name: "", description: "" })}>Cancel</button>}</div></form>{message && <p className="form-message">{message}</p>}</div><div className="panel"><span className="panel-label">SERVICES</span><h2>Saved Services</h2>{services.length === 0 ? <p className="empty">No services added yet.</p> : <div className="doc-list">{services.map((service) => <div className="doc-row faq-row" key={service.id}><div><b>{service.name}</b><small>{service.description}</small></div><div className="faq-actions"><button className="edit-btn" onClick={() => setServiceForm({ id: service.id, name: service.name, description: service.description })}>Edit</button><button className="delete-btn" onClick={() => deleteService(service.id)}>Delete</button></div></div>)}</div>}</div></div>}

        {section === "custom" && (
          <div className="data-layout">
            <div className="panel">
              <div className="panel-top"><div><span className="panel-label">CUSTOM DETAILS</span><h2>{customDetailForm.id ? "Edit custom details" : "Custom knowledge"}</h2></div><button type="button" className="edit-btn" onClick={() => { setCustomDetailForm({ id: null, file_name: "", content: "" }); setCustomDetailEditorOpen(true); }}>Add New</button></div>
              {customDetailEditorOpen && (
                <form className="profile-panel" onSubmit={saveCustomDetail}>
                  <label>File name<input value={customDetailForm.file_name} onChange={(e) => setCustomDetailForm({ ...customDetailForm, file_name: e.target.value })} placeholder="e.g. Company Policies" required /></label>
                  <label>Custom details<textarea value={customDetailForm.content} onChange={(e) => setCustomDetailForm({ ...customDetailForm, content: e.target.value })} placeholder="Write the business details the AI should know..." rows="12" required /></label>
                  <div className="faq-actions"><button className="auth-submit" disabled={saving}>{saving ? "Saving..." : customDetailForm.id ? "Update Details" : "Save Details"}</button>{customDetailForm.id && <button type="button" className="delete-btn" onClick={() => { setCustomDetailForm({ id: null, file_name: "", content: "" }); setCustomDetailEditorOpen(false); }}>Cancel</button>}</div>
                </form>
              )}
              {message && <p className="form-message">{message}</p>}
            </div>
            <div className="panel"><span className="panel-label">SAVED CUSTOM DETAILS</span><h2>Your files</h2>{customDetails.length === 0 ? <p className="empty">No custom details created yet.</p> : <div className="doc-list">{customDetails.map((item) => <div className="doc-row faq-row" key={item.id}><div><b>{item.file_name}</b><small>Created: {new Date(item.created_at).toLocaleString()} · Updated: {new Date(item.updated_at).toLocaleString()}</small><small>{item.content}</small></div><div className="faq-actions"><button className="edit-btn" onClick={() => { setCustomDetailForm({ id: item.id, file_name: item.file_name, content: item.content }); setCustomDetailEditorOpen(true); }}>Edit</button><button className="delete-btn" onClick={() => deleteCustomDetail(item.id)}>Delete</button></div></div>)}</div>}</div>
          </div>
        )}

        {section === "profile" && (
          <div className="panel profile-panel"><span className="panel-label">PERSONAL PORTFOLIO</span><h2>Profile Settings</h2><form onSubmit={saveProfile}><label>Full name<input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} /></label><label>Email<input value={profile.email} disabled /></label><label>Portfolio Profile Image<input type="file" accept="image/*" onChange={uploadPortfolioImage} disabled={saving} /></label>{profile.portfolio_image_url && <div className="portfolio-image-preview"><img src={profile.portfolio_image_url} alt="Portfolio profile preview" /><span>Shown in the circular portfolio profile area.</span></div>}<button className="auth-submit" disabled={saving}>{saving ? "Saving..." : "Save profile"}</button></form>{message && <p className="form-message">{message}</p>}</div>
        )}
      </main>
    </div>
  );
}

function AppRouter() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setUser(data.user || null); setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return <div className="loading-screen">Loading Orken AI...</div>;
  if (window.location.pathname === "/admin") return user ? <AdminDashboard user={user} onLogout={() => setUser(null)} /> : <Login onLogin={setUser} />;
  if (window.location.pathname === "/embed") {
    const businessId = new URLSearchParams(window.location.search).get("business_id");
    if (!businessId) return <div className="embed-error">Missing business_id.</div>;
    return <Chatbot businessId={businessId} embedded />;
  }
  return <PublicSite />;
}

function PublicSite() {
  const [contactStatus, setContactStatus] = useState("");
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [portfolioImage, setPortfolioImage] = useState("");
  useEffect(() => { const { data } = supabase.storage.from("portfolio-images").getPublicUrl("4f779903-738c-4dfe-bcc2-201ca06253f2/profile.jpg"); setPortfolioImage(data?.publicUrl || ""); }, []);

  async function submitContact(e) {
    e.preventDefault();
    setContactStatus("");
    setContactSubmitted(false);
    const form = e.currentTarget;
    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.whatsapp.value.trim() || null,
      message: form.message.value.trim(),
      source: "Orken AI portfolio contact form",
      status: "new",
    };
    const { error } = await supabase.from("leads").insert(payload);
    if (error) {
      setContactStatus("Unable to submit right now. Please try again.");
      return;
    }
    form.reset();
    setContactSubmitted(true);
    setContactStatus("Thanks For Contacting Us");
  }

  const skills = [
    { title: "AI Chatbots & AI Agents", items: ["Build AI chatbots for business websites.","Configure business-specific knowledge, FAQs, services, policies, and customer support information.","Create lead-generation flows that collect customer inquiries.","Build chatbot dashboards for business owners to manage their AI assistant.","Integrate AI into websites to automate repetitive customer-support tasks.","Design conversational experiences that work 24/7."] },
    { title: "Web Development", items: ["Build modern, responsive business websites.","Create professional landing pages and service websites.","Build and customize WordPress websites.","Develop responsive interfaces for desktop, tablet, and mobile.","Deploy websites using modern web platforms such as Vercel."] },
    { title: "AI Integration & Automation", items: ["Connect AI with websites and business workflows.","Automate customer-support and lead-generation processes.","Build practical AI solutions around a business's existing information and services."] },
    { title: "SEO & Search Visibility", items: ["On-page SEO optimization.","SEO-focused content writing.","Google Search Console setup and troubleshooting.","Sitemap and indexing issue resolution.","404 error identification and fixing.","Website content structured for search visibility."] },
  ];
  const clientServices = ["Build an AI chatbot for your business website.","Create an AI assistant trained around your business information.","Automate customer support and lead collection.","Build a professional business website.","Improve website SEO and search visibility.","Fix Google Search Console, indexing, sitemap, and 404 issues.","Connect AI, websites, and business workflows into practical solutions."];

  return (
    <>
      <nav className="portfolio-nav">
        <strong>NAVEED<span>KHAN</span></strong>
        <a href="#skills">Skills</a><a href="#work">Work</a><a href="#services">Services</a><a href="#contact">Contact</a>
        <a className="navcta" href="/admin">Admin Login</a>
      </nav>

      <main className="portfolio">
        <section className="portfolio-hero">
          <div className="portfolio-hero-copy">
            <div className="eyebrow">AI · WEB DEVELOPMENT · SEO · AUTOMATION</div>
            <h1>I build practical <em>digital solutions</em> for real business problems.</h1>
            <p>I build AI, web, and SEO solutions that help businesses automate support, improve their online presence, and solve real digital problems.</p>
            <div className="hero-actions"><a className="portfolio-primary" href="#work">View practical work</a><a className="portfolio-secondary" href="#contact">Contact me</a></div>
            <div className="hero-note">AI chatbots · Websites · Automation · SEO</div>
          </div>
          <div className="portfolio-hero-card">
            <div className="hero-card-top"><span>PERSONAL PORTFOLIO</span><span>01</span></div>
            {portfolioImage ? <img className="portfolio-profile-image" src={portfolioImage} alt="Naveed Khan" /> : <div className="hero-card-mark">NK</div>}
            <h2>Naveed Khan</h2>
            <p>AI, web development, automation and SEO solutions.</p>
            <div className="hero-card-line"><span>Focus</span><b>Practical systems</b></div>
            <div className="hero-card-line"><span>Approach</span><b>Build · Integrate · Improve</b></div>
          </div>
        </section>

        <section id="skills" className="portfolio-section">
          <div className="portfolio-heading"><span>01 / SKILLS & EXPERTISE</span><h2>Technical skills focused on useful outcomes.</h2></div>
          <div className="skill-grid">{skills.map((skill,index)=><article className="skill-card" key={skill.title}><span>0{index+1}</span><h3>{skill.title}</h3><ul>{skill.items.map(item=><li key={item}>{item}</li>)}</ul></article>)}</div>
        </section>

        <section id="work" className="portfolio-section work-section">
          <div className="portfolio-heading"><span>02 / PRACTICAL PROJECTS</span><h2>Projects built around real users and real problems.</h2><p className="projects-description">A practical portfolio of websites, AI solutions, automation workflows, and SEO work built to solve real digital needs.</p><div className="projects-count"><strong>200+</strong><span>Projects completed</span></div></div>
          <div className="project-grid">
            <article className="project-card"><div className="project-number">01</div><div>
              <span className="project-type">AI CUSTOMER SUPPORT CHATBOT</span><h3>AI Chatbot for Blog.GBBooking.com</h3>
              <p>Built and deployed an AI chatbot directly on Blog.GBBooking.com to provide visitors with automated assistance based on the website's business information.</p>
              <h4>What I implemented</h4><div className="tag-list"><span>AI chatbot</span><span>Business knowledge</span><span>FAQ responses</span><span>Lead generation</span><span>Customer support</span><span>Responsive integration</span></div>
              <p className="project-result">This demonstrates practical experience in AI chatbot development, website integration, customer support automation, and lead generation.</p>
              <a className="project-link" href="https://blog.gbbooking.com" target="_blank" rel="noreferrer">Visit project ↗</a>
            </div></article>
            <article className="project-card"><div className="project-number">02</div><div>
              <span className="project-type">GAMING GUIDES & SEO WEBSITE</span><h3>GameFixLab.site</h3>
              <p>Built and managed a practical gaming information and troubleshooting website focused on FPS drops, lag, high ping, overheating, crashes, and performance issues.</p>
              <h4>What I worked on</h4><div className="tag-list"><span>Website development</span><span>SEO content</span><span>Gaming guides</span><span>On-page SEO</span><span>Search Console</span><span>Indexing</span></div>
              <p className="project-result">The website covers gaming topics including PUBG/BGMI, Free Fire, Delta Force, Warzone and other gaming troubleshooting subjects.</p>
              <a className="project-link" href="https://gamefixlab.site" target="_blank" rel="noreferrer">Visit project ↗</a>
            </div></article>
          </div>
        </section>

        <section id="services" className="portfolio-section services-section">
          <div className="portfolio-heading"><span>03 / WHAT I CAN DO FOR CLIENTS</span><h2>From a business problem to a working digital solution.</h2></div>
          <div className="client-service-grid">{clientServices.map((item,index)=><div key={item}><b>0{index+1}</b><p>{item}</p></div>)}</div>
        </section>

        <section className="portfolio-statement"><span>APPROACH</span><h3>Practical AI, web, and SEO solutions that help businesses automate support, improve their online presence, and solve real digital problems.</h3></section>

        <section id="contact" className="portfolio-section contact-section">
          <div className="contact-copy"><span>04 / CONTACT</span><h2>Have a digital problem to solve?</h2><p>Send the details. Your message will be added to the same Lead Generation area in the admin dashboard for follow-up.</p><div className="contact-points"><span>AI Chatbots</span><span>AI Agents</span><span>Websites</span><span>Automation</span><span>SEO</span></div></div>
          <form className="portfolio-contact-form" onSubmit={submitContact}>
            <label>Name<input name="name" placeholder="Your name" required /></label>
            <label>Email<input name="email" type="email" placeholder="you@example.com" required /></label>
            <label>WhatsApp<input name="whatsapp" placeholder="Optional" /></label>
            <label>Message<textarea name="message" rows="6" placeholder="Tell me what you want to build or fix..." required /></label>
            <button className={contactSubmitted ? "submitted-contact-btn" : ""} type="submit" disabled={contactSubmitted}>{contactSubmitted ? "Submitted ✓" : "Send inquiry →"}</button>
            {contactStatus && <p className="contact-status">{contactStatus}</p>}
          </form>
        </section>
      </main>

      <footer className="portfolio-footer"><div><strong>NAVEED<span>KHAN</span></strong><p>AI · Web Development · Automation · SEO</p></div><div className="footer-links"><a href="#skills">Skills</a><a href="#work">Work</a><a href="#contact">Contact</a></div></footer>
      <Chatbot />
    </>
  );
}
export function App() {
  return <AppRouter />;
}
