import { useEffect, useState } from "react";
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

function Chatbot() {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [items, setItems] = useState([
    { role: "ai", text: "Hi, I'm Orken AI. How can I help?" },
  ]);

  async function send(t = msg) {
    const question = t.trim();
    if (!question) return;
    setItems((x) => [...x, { role: "user", text: question }]);
    setMsg("");
    try {
      const { data, error } = await supabase.functions.invoke("chat-with-knowledge", {
        body: {
          message: question,
          history: items.slice(-6),
        },
      });
      if (error) throw error;
      setItems((x) => [...x, { role: "ai", text: data?.answer || "I don't have that information in the business knowledge yet." }]);
    } catch (error) {
      setItems((x) => [...x, { role: "ai", text: "I’m unable to access the business knowledge right now." }]);
    }
  }

  return (
    <div className="chat">
      <button className="launcher" onClick={() => setOpen(!open)} aria-label="Open Orken AI chat" />
      {open && (
        <div className="window">
          <header>
            <b>Orken AI</b>
            <span>GROQ-POWERED · LIVE</span>
          </header>
          <main>
            {items.map((x, i) => (
              <p key={i} className={x.role === "user" ? "user-message" : "ai-message"}>
                {x.text}
              </p>
            ))}
          </main>
          <div className="suggest">
            <button onClick={() => send("What do you build?")}>What do you build?</button>
            <button onClick={() => send("How long does it take?")}>How long?</button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(); }}>
            <button type="button" className="mic-icon" aria-label="Use microphone">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M19 11a7 7 0 0 1-14 0M12 18v4M8 22h8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
            <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Ask Orken AI..." />
            <button aria-label="Send message" className="send-icon" type="submit">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3 10.5 13.5M21 3l-6.7 18-3.8-7.5L3 9.7 21 3Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
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
  const [profile, setProfile] = useState({ full_name: "", email: user.email || "" });
  const [leads, setLeads] = useState([]);
  const [docs, setDocs] = useState([]);
  const [faqs, setFaqs] = useState([]);
const [services, setServices] = useState([]);
const [serviceForm, setServiceForm] = useState({ id: null, name: "", description: "" });
  const [faqForm, setFaqForm] = useState({ id: null, question: "", answer: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);

  async function loadDashboard() {
    const [{ data: p }, { data: l }, { data: d }, { data: f }, { data: s }] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("knowledge_documents").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("faqs").select("*").order("created_at", { ascending: false }),
supabase.from("services").select("*").order("created_at", { ascending: false }),
    ]);
    setProfile({ full_name: p?.full_name || "", email: user.email || "" });
    setLeads(l || []);
    setDocs(d || []);
    setFaqs(f || []);
  }

  useEffect(() => { loadDashboard(); }, [user.id]);

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

  async function deleteFaq(id) {
    setSaving(true);
    const { error } = await supabase.from("faqs").delete().eq("id", id);
    setMessage(error ? error.message : "FAQ deleted.");
    await loadDashboard();
    setSaving(false);
  }

  async function deleteLead(id) {
    await supabase.from("leads").delete().eq("id", id);
    await loadDashboard();
  }

  function logout() {
    supabase.auth.signOut();
    onLogout();
  }

  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.status === "new").length;

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
        <button className={section === "profile" ? "active" : ""} onClick={() => setSection("profile")}>Profile Settings</button>
        <button className="logout" onClick={logout}>Sign out</button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div><span>ADMIN DASHBOARD</span><h1>{section === "overview" ? "Overview" : section === "leads" ? "Lead Generation" : section === "data" ? "Knowledge Data" : section === "faqs" ? "FAQs" : section === "services" ? "Services" : "Profile Settings"}</h1></div>
          <div className="dashboard-user">{profile.full_name || user.email}</div>
        </header>

        {section === "overview" && (
          <div className="dashboard-grid">
            <div className="stat-card"><span>TOTAL LEADS</span><b>{totalLeads}</b></div>
            <div className="stat-card"><span>NEW LEADS</span><b>{newLeads}</b></div>
            <div className="stat-card"><span>KNOWLEDGE FILES</span><b>{docs.length}</b></div>
            <div className="panel"><span className="panel-label">ACCOUNT</span><h2>Admin account active</h2><p>{user.email}</p><p>Connected to the Orken AI Supabase project.</p></div>
          </div>
        )}

        {section === "leads" && (
          <div className="panel">
            <div className="panel-top"><div><span className="panel-label">CUSTOMER INQUIRIES</span><h2>Lead Generation</h2></div><b>{leads.length} leads</b></div>
            {leads.length === 0 ? <p className="empty">No leads yet.</p> : (
              <div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Message</th><th>Status</th><th>Created</th><th></th></tr></thead>
                <tbody>{leads.map((lead) => <tr key={lead.id}><td>{lead.name}</td><td>{lead.email || "—"}</td><td>{lead.phone || "—"}</td><td>{lead.message || "—"}</td><td><span className="status-pill">{lead.status}</span></td><td>{new Date(lead.created_at).toLocaleString()}</td><td><button className="delete-btn" onClick={() => deleteLead(lead.id)}>Delete</button></td></tr>)}</tbody>
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

        {section === "profile" && (
          <div className="panel profile-panel"><span className="panel-label">ACCOUNT</span><h2>Profile Settings</h2><form onSubmit={saveProfile}><label>Full name<input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} /></label><label>Email<input value={profile.email} disabled /></label><button className="auth-submit" disabled={saving}>{saving ? "Saving..." : "Save profile"}</button></form>{message && <p className="form-message">{message}</p>}</div>
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
  return <PublicSite />;
}

function PublicSite() {
  return (
    <>
      <nav>
        <strong>ORKEN<span>AI</span></strong>
        <a href="#agents">Agents</a><a href="#process">Process</a><a href="#about">About</a>
        <a className="navcta" href="/admin">Admin Login</a>
      </nav>
      <section className="hero">
        <div className="eyebrow">AI ENGINEERING · PRODUCTION SYSTEMS</div>
        <h1>Production AI agents that <i>work while you sleep.</i></h1>
        <p>Orken AI deploys intelligent agents and end-to-end workflows for support, sales, and operations.</p>
        <a className="cta" href="mailto:hello@orken.us?subject=Orken%20AI%20Discovery%20Call">Start a discovery call →</a>
        <div className="metrics"><b>80+<small>AGENTS DEPLOYED</small></b><b>2.4M+<small>TASKS AUTOMATED</small></b><b>94%<small>AVG. COST REDUCTION</small></b><b>24/7<small>AGENTS ONLINE</small></b></div>
      </section>
      <section id="agents"><div className="sectionhead"><span>01 / CAPABILITIES</span><h2>Agents built for real work.</h2></div><div className="grid">{agents.map((a, i) => <article key={a}><small>0{i + 1}</small><h3>{a}</h3><p>Production-ready AI systems designed around your business workflows, data, and customer experience.</p></article>)}</div></section>
      <section className="aria"><div><span>LIVE AGENT</span><h2>Meet Aria.</h2><p>Orken Sales Agent. Always online, fast, and designed to qualify conversations without adding another human inbox.</p></div><div className="status">● ONLINE<br/><b>&lt;1s</b><small>RESPONSE TIME</small></div></section>
      <section id="process"><div className="sectionhead"><span>02 / DELIVERY</span><h2>From idea to production in 4 weeks.</h2></div><div className="process">{["Discovery & eval set","Build & integrate","Shadow mode","Production launch"].map((x,i)=><div key={x}><b>0{i+1}</b><h3>{x}</h3><p>Clear milestones, measurable evaluations, and a controlled path to production.</p></div>)}</div></section>
      <section id="about" className="about"><span>03 / ORKEN AI</span><h2>We're not a consultancy.<br/>We're an AI engineering team that ships.</h2><p>Ship-first. Eval-driven. Observable. Honest.</p></section>
      <footer>ORKEN AI<span>Production AI agents & automation</span></footer>
      <Chatbot />
    </>
  );
}

export function App() {
  return <AppRouter />;
}
