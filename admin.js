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
  const workModal = $("#workModal"), workForm = $("#workForm"), workPreview = $("#workPreview");
  let workReturnFocus = null;
  const defaultWorkDescription = "Uma tatuagem autoral feita pela Duda Neves.";
  const cropModal = $("#cropModal"), cropStage = $("#cropStage"), cropImage = $("#cropImage"), cropZoom = $("#cropZoom"), cropAspect = $("#cropAspect");
  const profilePreviews = { heroPhoto: $("#heroPhotoPreview"), storyPhoto: $("#storyPhotoPreview") };
  const profileInputs = { heroPhoto: $("#profileForm").elements.hero_photo, storyPhoto: $("#profileForm").elements.story_photo };
  const profilePreviewUrls = { heroPhoto: "", storyPhoto: "" };
  let profileState = null;
  let cropSource = null, cropSourceFile = null, cropSourceUrl = "", cropContext = "", cropState = null, cropFromPicker = false;
  let pendingWorkFile = null, pendingProfileFiles = { heroPhoto: null, storyPhoto: null }, workPreviewUrl = "";
  const isProfilePhoto = (context) => context === "heroPhoto" || context === "storyPhoto";
  function clampCrop() {
    const width = cropStage.clientWidth, height = cropStage.clientHeight;
    cropState.x = Math.min(0, Math.max(width - cropState.imageWidth, cropState.x));
    cropState.y = Math.min(0, Math.max(height - cropState.imageHeight, cropState.y));
  }
  function drawCropPosition() {
    if (!cropState) return;
    clampCrop();
    cropImage.style.width = `${cropState.imageWidth}px`;
    cropImage.style.height = `${cropState.imageHeight}px`;
    cropImage.style.left = `${cropState.x}px`;
    cropImage.style.top = `${cropState.y}px`;
  }
  function initializeCrop() {
    const ratio = cropAspect.value === "square" ? 1 : cropAspect.value === "portrait" ? (isProfilePhoto(cropContext) ? 4 / 5 : 3 / 4) : cropSource.naturalWidth / cropSource.naturalHeight;
    const maxWidth = Math.min(440, cropModal.querySelector(".crop-modal-card").clientWidth - 48);
    const maxHeight = Math.min(440, window.innerHeight * 0.45);
    let width = maxWidth, height = width / ratio;
    if (height > maxHeight) { height = maxHeight; width = height * ratio; }
    cropStage.style.width = `${width}px`;
    cropStage.style.height = `${height}px`;
    cropStage.style.aspectRatio = "auto";
    const fit = Math.max(width / cropSource.naturalWidth, height / cropSource.naturalHeight);
    cropZoom.value = "1";
    cropState = { fit, zoom: 1, width, height, imageWidth: cropSource.naturalWidth * fit, imageHeight: cropSource.naturalHeight * fit, changed: false };
    cropState.x = (width - cropState.imageWidth) / 2;
    cropState.y = (height - cropState.imageHeight) / 2;
    drawCropPosition();
  }
  function openCrop(file, context, fromPicker = false) {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 20 * 1024 * 1024) { notice("A imagem precisa ter até 20 MB para abrir o recorte.", true); return; }
    cropContext = context;
    cropFromPicker = fromPicker;
    cropSourceFile = file;
    cropState = null;
    cropAspect.value = "original";
    cropAspect.options[1].textContent = isProfilePhoto(context) ? "Retrato (4:5)" : "Retrato (3:4)";
    cropSourceUrl = URL.createObjectURL(file);
    cropSource = new Image();
    cropSource.onload = () => {
      cropImage.src = cropSourceUrl;
      cropModal.classList.add("open");
      cropModal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
      requestAnimationFrame(initializeCrop);
    };
    cropSource.onerror = () => { notice("Não foi possível abrir essa imagem.", true); closeCrop(true); };
    cropSource.src = cropSourceUrl;
  }
  function closeCrop(cancelled) {
    cropModal.classList.remove("open");
    cropModal.setAttribute("aria-hidden", "true");
    if (!workModal.classList.contains("open")) document.body.classList.remove("modal-open");
    if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl);
    cropSourceUrl = ""; cropSource = null; cropSourceFile = null; cropState = null;
    if (cancelled) {
      if (cropContext === "work") workForm.elements.image.value = "";
      if (cropFromPicker && isProfilePhoto(cropContext)) profileInputs[cropContext].value = "";
    }
    cropFromPicker = false;
  }
  $("#cancelCrop").addEventListener("click", () => closeCrop(true));
  $("#cancelCropBottom").addEventListener("click", () => closeCrop(true));
  cropModal.addEventListener("click", (e) => { if (e.target === cropModal) closeCrop(true); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && cropModal.classList.contains("open")) closeCrop(true); });
  cropStage.addEventListener("pointerdown", (e) => {
    if (!cropState) return;
    cropStage.setPointerCapture(e.pointerId);
    cropState.drag = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, imageX: cropState.x, imageY: cropState.y };
  });
  cropStage.addEventListener("pointermove", (e) => {
    if (!cropState?.drag || cropState.drag.pointerId !== e.pointerId) return;
    const oldX = cropState.x, oldY = cropState.y;
    cropState.x = cropState.drag.imageX + e.clientX - cropState.drag.x;
    cropState.y = cropState.drag.imageY + e.clientY - cropState.drag.y;
    drawCropPosition();
    if (cropState.x !== oldX || cropState.y !== oldY) cropState.changed = true;
  });
  ["pointerup", "pointercancel"].forEach((name) => cropStage.addEventListener(name, () => { if (cropState) cropState.drag = null; }));
  cropZoom.addEventListener("input", () => {
    if (!cropState) return;
    const centerX = (cropState.width / 2 - cropState.x) / cropState.imageWidth;
    const centerY = (cropState.height / 2 - cropState.y) / cropState.imageHeight;
    cropState.zoom = Number(cropZoom.value);
    if (cropState.zoom !== 1) cropState.changed = true;
    cropState.imageWidth = cropSource.naturalWidth * cropState.fit * cropState.zoom;
    cropState.imageHeight = cropSource.naturalHeight * cropState.fit * cropState.zoom;
    cropState.x = cropState.width / 2 - centerX * cropState.imageWidth;
    cropState.y = cropState.height / 2 - centerY * cropState.imageHeight;
    drawCropPosition();
  });
  cropAspect.addEventListener("change", () => { if (cropSource) { initializeCrop(); cropState.changed = cropAspect.value !== "original"; } });
  $("#applyCrop").addEventListener("click", () => {
    if (!cropState || !cropSource) return;
    if (!cropState.changed) {
      const original = cropSourceFile;
      const previewUrl = URL.createObjectURL(original);
      if (cropContext === "work") {
        pendingWorkFile = original;
        if (workPreviewUrl) URL.revokeObjectURL(workPreviewUrl);
        workPreviewUrl = previewUrl; workPreview.src = previewUrl; workPreview.hidden = false;
      } else {
        pendingProfileFiles[cropContext] = original;
        if (profilePreviewUrls[cropContext]) URL.revokeObjectURL(profilePreviewUrls[cropContext]);
        profilePreviewUrls[cropContext] = previewUrl; profilePreviews[cropContext].src = previewUrl;
      }
      closeCrop(false);
      return;
    }
    const canvas = document.createElement("canvas");
    const sourceX = -cropState.x / (cropState.fit * cropState.zoom);
    const sourceY = -cropState.y / (cropState.fit * cropState.zoom);
    const sourceWidth = cropState.width / (cropState.fit * cropState.zoom);
    const sourceHeight = cropState.height / (cropState.fit * cropState.zoom);
    canvas.width = Math.max(1, Math.round(sourceWidth));
    canvas.height = Math.max(1, Math.round(sourceHeight));
    canvas.getContext("2d").drawImage(cropSource, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) { notice("Não foi possível preparar a imagem recortada.", true); return; }
      const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
      const cropped = new File([blob], `${cropContext}-recortada.${extension}`, { type: blob.type });
      const previewUrl = URL.createObjectURL(blob);
      if (cropContext === "work") {
        pendingWorkFile = cropped;
        if (workPreviewUrl) URL.revokeObjectURL(workPreviewUrl);
        workPreviewUrl = previewUrl; workPreview.src = previewUrl; workPreview.hidden = false;
      } else {
        pendingProfileFiles[cropContext] = cropped;
        if (profilePreviewUrls[cropContext]) URL.revokeObjectURL(profilePreviewUrls[cropContext]);
        profilePreviewUrls[cropContext] = previewUrl; profilePreviews[cropContext].src = previewUrl;
      }
      closeCrop(false);
    }, cropSourceFile.type, 0.95);
  });
  function openWorkModal(work) {
    workForm.reset();
    pendingWorkFile = null;
    if (workPreviewUrl) { URL.revokeObjectURL(workPreviewUrl); workPreviewUrl = ""; }
    workForm.elements.id.value = work ? work.id : "";
    workForm.elements.title.value = work ? work.title : "";
    workForm.elements.style.value = work ? work.style : "";
    workForm.elements.size.value = work ? work.size : "";
    workForm.elements.body_part.value = work ? work.body_part : "";
    workForm.elements.description.value = work ? (work.description || defaultWorkDescription) : "";
    workForm.elements.image.required = !work;
    workPreview.src = work ? work.image_url : "";
    workPreview.hidden = !work;
    $("#workModalTitle").textContent = work ? "Editar trabalho" : "Adicionar novo trabalho";
    $("#saveWork").textContent = work ? "Salvar alterações" : "Adicionar trabalho";
    $("#deleteWork").hidden = !work;
    workReturnFocus = document.activeElement;
    workModal.classList.add("open");
    workModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => workForm.elements.title.focus());
  }
  function closeWorkModal() {
    workModal.classList.remove("open");
    workModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (workReturnFocus) workReturnFocus.focus();
  }
  $("#closeWorkModal").addEventListener("click", closeWorkModal);
  $("#cancelWorkModal").addEventListener("click", closeWorkModal);
  workModal.addEventListener("click", (e) => { if (e.target === workModal) closeWorkModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && workModal.classList.contains("open")) closeWorkModal(); });
  $("#workPreview").hidden = true;
  workForm.elements.image.addEventListener("change", () => {
    const file = workForm.elements.image.files[0];
    if (!file) return;
    openCrop(file, "work");
  });
  Object.entries(profileInputs).forEach(([context, input]) => input.addEventListener("change", (e) => { const file = e.currentTarget.files[0]; if (file) openCrop(file, context, true); }));
  document.querySelectorAll("[data-edit-photo]").forEach((button) => button.addEventListener("click", async () => {
    const context = button.dataset.editPhoto;
    try {
      const currentFile = pendingProfileFiles[context] || profileInputs[context].files[0];
      if (currentFile) { openCrop(currentFile, context); return; }
      const response = await fetch(profilePreviews[context].src);
      if (!response.ok) throw new Error("Não foi possível carregar essa foto para editar.");
      const blob = await response.blob();
      const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
      openCrop(new File([blob], `${context}.${extension}`, { type: blob.type || "image/jpeg" }), context);
    } catch (error) { notice(error.message || "Não foi possível abrir o recorte dessa foto.", true); }
  }));
  $("#workForm").addEventListener("submit", async (e) => {
    e.preventDefault(); const form = e.currentTarget, fd = new FormData(form), id = fd.get("id"), file = fd.get("image");
    const button = $("#saveWork"); button.disabled = true;
    try {
      let imageUrl;
      const imageToUpload = pendingWorkFile || file;
      if (imageToUpload && imageToUpload.size) {
        if (imageToUpload.size > 8 * 1024 * 1024) throw new Error("A imagem recortada precisa ter até 8 MB.");
        const path = `${crypto.randomUUID()}-${imageToUpload.name.replace(/[^\w.-]/g, "-")}`;
        const { error } = await client.storage.from("tattoo-portfolio").upload(path, imageToUpload, { upsert: false }); if (error) throw error;
        imageUrl = client.storage.from("tattoo-portfolio").getPublicUrl(path).data.publicUrl;
      }
      const row = { title: fd.get("title"), style: fd.get("style"), size: fd.get("size"), body_part: fd.get("body_part"), description: fd.get("description") };
      if (imageUrl) row.image_url = imageUrl;
      const result = id ? await client.from("portfolio").update(row).eq("id", id) : await client.from("portfolio").insert({ ...row, image_url: imageUrl, sort_order: Math.floor(Date.now() / 1000) });
      if (result.error) throw result.error;
      pendingWorkFile = null;
      if (workPreviewUrl) { URL.revokeObjectURL(workPreviewUrl); workPreviewUrl = ""; }
      closeWorkModal();
      await loadWorks(); notice(id ? "Trabalho atualizado e publicado." : "Novo trabalho adicionado ao portfólio.");
    } catch (error) { notice(error.message, true); } finally { button.disabled = false; }
  });
  $("#deleteWork").addEventListener("click", async () => {
    const id = workForm.elements.id.value, title = workForm.elements.title.value;
    if (!id || !confirm(`Excluir “${title}” do portfólio?`)) return;
    const button = $("#deleteWork"); button.disabled = true;
    try { const { error } = await client.from("portfolio").delete().eq("id", id); if (error) throw error; closeWorkModal(); await loadWorks(); notice("Trabalho removido do portfólio público."); }
    catch (error) { notice(error.message, true); } finally { button.disabled = false; }
  });
  async function loadWorks() {
    const { data, error } = await client.from("portfolio").select("*").order("sort_order"); if (error) throw error;
    $("#worksList").innerHTML = '<button type="button" class="add-work-card" id="addWork"><span class="plus" aria-hidden="true">+</span><span>Adicionar novo trabalho</span></button>' + data.map((w) => `<button type="button" class="work-card" data-edit="${w.id}" aria-label="Editar ${esc(w.title)}"><img src="${esc(w.image_url)}" alt=""><h3>${esc(w.title)}</h3><p>${esc(w.style)} · ${esc(w.size)} · ${esc(w.body_part)}</p></button>`).join("");
    $("#addWork").addEventListener("click", () => openWorkModal(null));
    data.forEach((w) => $(`[data-edit="${w.id}"]`).addEventListener("click", () => openWorkModal(w)));
  }
  $("#profileForm").addEventListener("submit", async (e) => {
    e.preventDefault(); const form = e.currentTarget, fd = new FormData(form);
    try {
      const photoUrls = {};
      for (const [context, input] of Object.entries(profileInputs)) {
        const file = pendingProfileFiles[context] || fd.get(input.name);
        if (file && file.size) {
          if (file.size > 8 * 1024 * 1024) throw new Error("Cada imagem precisa ter até 8 MB.");
          const path = `profile/${context}-${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "-")}`;
          const { error } = await client.storage.from("tattoo-portfolio").upload(path, file);
          if (error) throw error;
          photoUrls[context] = client.storage.from("tattoo-portfolio").getPublicUrl(path).data.publicUrl;
        }
      }
      const row = { id: 1, display_name: fd.get("display_name"), bio: fd.get("bio"), hero_photo_url: photoUrls.heroPhoto || profileState?.hero_photo_url || profileState?.photo_url || "", story_photo_url: photoUrls.storyPhoto || profileState?.story_photo_url || profileState?.photo_url || "", updated_at: new Date().toISOString() };
      const { error } = await client.from("profile").upsert(row); if (error) throw error;
      profileState = { ...profileState, ...row };
      Object.entries(profilePreviews).forEach(([context, preview]) => {
        if (photoUrls[context]) preview.src = photoUrls[context];
        pendingProfileFiles[context] = null;
        if (profilePreviewUrls[context]) { URL.revokeObjectURL(profilePreviewUrls[context]); profilePreviewUrls[context] = ""; }
        profileInputs[context].value = "";
      });
      notice("Perfil atualizado.");
    } catch (error) { notice(error.message, true); }
  });
  async function loadProfile() { const { data, error } = await client.from("profile").select("*").eq("id", 1).single(); if (error) throw error; profileState = data; const f = $("#profileForm"); f.elements.display_name.value = data.display_name; f.elements.bio.value = data.bio; profilePreviews.heroPhoto.src = data.hero_photo_url || data.photo_url || "assets/duda.jpg"; profilePreviews.storyPhoto.src = data.story_photo_url || data.photo_url || "assets/duda.jpg"; }
  client?.auth.onAuthStateChange((_event, session) => { if (!session) { dashboard.hidden = true; loginView.hidden = false; } });
  adminSession().catch((error) => msg("#loginMessage", error.message));
})();
