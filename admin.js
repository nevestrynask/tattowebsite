(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const loginView = $("#login"), dashboard = $("#dashboard");
  const configured = window.DN_SUPABASE_URL && window.DN_SUPABASE_ANON_KEY && !window.DN_SUPABASE_URL.includes("COLE_");
  const client = configured && window.supabase ? window.supabase.createClient(window.DN_SUPABASE_URL, window.DN_SUPABASE_ANON_KEY) : null;
  const esc = (v) => String(v || "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const notice = (message, bad = false) => { const el = $("#notice"); el.textContent = message; el.style.color = bad ? "#ff9183" : ""; };
  const msg = (id, message) => { $(id).textContent = message; };
  const ready = () => { if (!client) throw new Error("Configure a URL e a chave publicável no arquivo supabase-config.js e recarregue esta página."); };
  async function adminSession() {
    ready();
    const { data: { session } } = await client.auth.getSession();
    if (!session) return false;
    const { data, error } = await client.from("admin_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
    if (error || !data) { await client.auth.signOut(); throw new Error("Este usuário ainda não foi autorizado como administradora."); }
    loginView.hidden = true; dashboard.hidden = false;
    try { await Promise.all([loadOrders(), loadAvailability(), loadWorks(), loadProfile()]); }
    catch (loadError) { notice(loadError.message, true); }
    return true;
  }
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault(); const button = $("button", e.currentTarget); button.disabled = true;
    try {
      ready(); const form = new FormData(e.currentTarget);
      const { error } = await client.auth.signInWithPassword({ email: form.get("email"), password: form.get("password") });
      if (error) throw error;
      await adminSession();
    } catch (error) { msg("#loginMessage", error.message); }
    finally { button.disabled = false; }
  });
  $("#logout").addEventListener("click", async () => { await client.auth.signOut(); dashboard.hidden = true; loginView.hidden = false; });
  $("#refreshOrders").addEventListener("click", () => loadOrders().catch((e) => notice(e.message, true)));
  async function loadOrders() {
    const { data, error } = await client.from("orders").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    $("#ordersList").innerHTML = data.length ? data.map((o) => {
      const date = new Date(o.preferred_date + "T12:00:00").toLocaleDateString("pt-BR");
      const text = `Olá, ${o.name}! Vi seu pedido de tatuagem para ${date}. Vamos combinar um horário?`;
      let clientPhone = String(o.phone).replace(/\D/g, "");
      if (clientPhone.length === 10 || clientPhone.length === 11) clientPhone = "55" + clientPhone;
      return `<article class="order-card"><div class="order-top"><h3>${esc(o.name)} · ${esc(o.style)}</h3><span>${date}</span></div><p>WhatsApp: ${esc(o.phone)} · ${esc(o.size_cm)} cm · ${esc(o.body_part)}</p><p>${esc(o.idea || "Sem descrição adicional")}</p><select aria-label="Status do pedido" data-order="${o.id}"><option value="novo">Novo</option><option value="em_conversa">Em conversa</option><option value="confirmado">Confirmado</option><option value="recusado">Recusado</option><option value="concluido">Concluído</option></select><br><a target="_blank" rel="noopener" href="https://wa.me/${clientPhone}?text=${encodeURIComponent(text)}">Conversar no WhatsApp ↗</a></article>`;
    }).join("") : '<p class="empty">Ainda não há pedidos recebidos.</p>';
    data.forEach((o) => { const select = $(`[data-order="${o.id}"]`); select.value = o.status; select.addEventListener("change", async () => { const { error } = await client.from("orders").update({ status: select.value }).eq("id", o.id); notice(error ? error.message : "Status do pedido atualizado.", !!error); }); });
  }
  $("#availabilityForm").addEventListener("submit", async (e) => {
    e.preventDefault(); const form = e.currentTarget, fd = new FormData(form);
    const date = fd.get("date"), isAvailable = fd.get("is_available") === "true";
    try {
      const { error } = await client.from("availability").upsert({ date, is_available: isAvailable, updated_at: new Date().toISOString() });
      if (error) throw error;
      form.reset();
      await loadAvailability();
      notice(`Dia ${new Date(date + "T12:00:00").toLocaleDateString("pt-BR")} salvo como ${isAvailable ? "disponível" : "indisponível"}.`);
    }
    catch (error) { notice(error.message, true); }
  });
  async function loadAvailability() {
    const { data, error } = await client.from("availability").select("date,is_available").order("date"); if (error) throw error;
    const future = data.filter((d) => d.date >= new Date().toISOString().slice(0, 10));
    $("#availabilityList").innerHTML = future.length ? future.map((d) => `<div class="date-card"><span>${new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR")} · ${d.is_available ? "Disponível" : "Indisponível"}</span><button class="secondary" data-date="${d.date}">Remover exceção</button></div>`).join("") : '<p class="empty">Sem exceções futuras cadastradas.</p>';
    $("#availabilityList").querySelectorAll("[data-date]").forEach((b) => b.addEventListener("click", async () => { const { error } = await client.from("availability").delete().eq("date", b.dataset.date); if (error) notice(error.message, true); else { await loadAvailability(); notice("Exceção removida. O dia voltou a ficar disponível."); } }));
  }
  $("#workForm").addEventListener("submit", async (e) => {
    e.preventDefault(); const form = e.currentTarget, fd = new FormData(form), id = fd.get("id"), file = fd.get("image");
    const button = $("button[type=submit]", form); button.disabled = true;
    try {
      let imageUrl;
      if (file && file.size) {
        if (file.size > 8 * 1024 * 1024) throw new Error("A imagem precisa ter até 8 MB.");
        const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "-")}`;
        const { error } = await client.storage.from("tattoo-portfolio").upload(path, file, { upsert: false }); if (error) throw error;
        imageUrl = client.storage.from("tattoo-portfolio").getPublicUrl(path).data.publicUrl;
      }
      const row = { title: fd.get("title"), style: fd.get("style"), size: fd.get("size"), body_part: fd.get("body_part"), description: fd.get("description") };
      if (imageUrl) row.image_url = imageUrl;
      const result = id ? await client.from("portfolio").update(row).eq("id", id) : await client.from("portfolio").insert({ ...row, image_url: imageUrl, sort_order: Math.floor(Date.now() / 1000) });
      if (result.error) throw result.error;
      form.reset(); $("[name=id]", form).value = ""; $("[name=image]", form).required = true; $("#cancelEdit").hidden = true; button.textContent = "Adicionar trabalho";
      await loadWorks(); notice("Portfólio atualizado e publicado.");
    } catch (error) { notice(error.message, true); } finally { button.disabled = false; }
  });
  $("#cancelEdit").addEventListener("click", () => { $("#workForm").reset(); $("[name=id]").value = ""; $("[name=image]").required = true; $("#cancelEdit").hidden = true; $("#workForm button[type=submit]").textContent = "Adicionar trabalho"; });
  async function loadWorks() {
    const { data, error } = await client.from("portfolio").select("*").order("sort_order"); if (error) throw error;
    $("#worksList").innerHTML = data.length ? data.map((w) => `<article class="work-card"><img src="${esc(w.image_url)}" alt="${esc(w.title)}"><h3>${esc(w.title)}</h3><p>${esc(w.style)} · ${esc(w.size)} · ${esc(w.body_part)}</p><div class="work-actions"><button class="secondary" data-edit="${w.id}">Editar</button><button data-delete="${w.id}">Excluir</button></div></article>`).join("") : '<p class="empty">Adicione o primeiro trabalho; a galeria existente no site permanece visível até você publicar itens aqui.</p>';
    data.forEach((w) => {
      $(`[data-edit="${w.id}"]`).addEventListener("click", () => { const f = $("#workForm"); ["id","title","style","size","body_part","description"].forEach((k) => { $(`[name="${k}"]`, f).value = k === "id" ? w.id : w[k] || ""; }); $("[name=image]", f).required = false; $("#cancelEdit").hidden = false; $("button[type=submit]", f).textContent = "Salvar alterações"; f.scrollIntoView({ behavior: "smooth" }); });
      $(`[data-delete="${w.id}"]`).addEventListener("click", async () => { if (!confirm(`Excluir “${w.title}” do portfólio?`)) return; const { error } = await client.from("portfolio").delete().eq("id", w.id); if (error) notice(error.message, true); else { await loadWorks(); notice("Trabalho removido do portfólio público."); } });
    });
  }
  $("#profileForm").addEventListener("submit", async (e) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget); let photoUrl;
    try {
      const file = fd.get("photo");
      if (file && file.size) { if (file.size > 8 * 1024 * 1024) throw new Error("A imagem precisa ter até 8 MB."); const path = `profile/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "-")}`; const { error } = await client.storage.from("tattoo-portfolio").upload(path, file); if (error) throw error; photoUrl = client.storage.from("tattoo-portfolio").getPublicUrl(path).data.publicUrl; }
      const row = { id: 1, display_name: fd.get("display_name"), bio: fd.get("bio"), updated_at: new Date().toISOString() }; if (photoUrl) row.photo_url = photoUrl;
      const { error } = await client.from("profile").upsert(row); if (error) throw error; notice("Perfil atualizado.");
    } catch (error) { notice(error.message, true); }
  });
  async function loadProfile() { const { data, error } = await client.from("profile").select("*").eq("id", 1).single(); if (error) throw error; const f = $("#profileForm"); f.elements.display_name.value = data.display_name; f.elements.bio.value = data.bio; }
  client?.auth.onAuthStateChange((_event, session) => { if (!session) { dashboard.hidden = true; loginView.hidden = false; } });
  adminSession().catch((error) => msg("#loginMessage", error.message));
})();
