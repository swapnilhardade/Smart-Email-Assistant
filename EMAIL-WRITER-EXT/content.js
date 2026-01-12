console.log("Email Writer Extension - Content Script Loaded");

/* ---------------- TONE DROPDOWN ---------------- */
function createToneDropdown() {
    const select = document.createElement('select');
    select.className = 'ai-tone-dropdown';
    select.style.marginRight = '8px';
    select.style.padding = '4px';

    const tones = ['professional', 'friendly', 'formal', 'casual'];
    tones.forEach(tone => {
        const option = document.createElement('option');
        option.value = tone;
        option.textContent = tone.charAt(0).toUpperCase() + tone.slice(1);
        select.appendChild(option);
    });

    return select;
}

/* ---------------- BUTTON ---------------- */
function createAIButton() {
    const button = document.createElement('div');
    button.className = 'T-I J-J5-Ji aoO v7 T-I-atl L3 ai-reply-button';
    button.style.marginRight = '8px';
    button.innerText = 'AI Reply';
    button.setAttribute('role', 'button');
    return button;
}

/* ---------------- EMAIL CONTENT ---------------- */
function getEmailContent() {
    const selectors = ['.a3s.aiL', '.h7', '.gmail_quote', '[role="listitem"] .a3s'];
    for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el && el.innerText && el.innerText.trim().length > 30) {
            return el.innerText.trim();
        }
    }
    return null;
}

/* ---------------- TOOLBAR ---------------- */
function findComposeToolbar() {
    const selectors = ['.btC', '.aDh', '[role="toolbar"]', '.gU.Up'];
    for (const s of selectors) {
        const el = document.querySelector(s);
        if (el) return el;
    }
    return null;
}

/* ---------------- INJECT BUTTON & DROPDOWN ---------------- */
function injectUI() {
    if (document.querySelector('.ai-reply-button')) return;

    const toolbar = findComposeToolbar();
    if (!toolbar) return;

    const toneDropdown = createToneDropdown();
    const button = createAIButton();

    button.addEventListener('click', async () => {
        button.innerText = 'Generating...';
        button.style.pointerEvents = 'none';

        const emailContent = getEmailContent();
        const tone = toneDropdown.value;

        if (!emailContent) {
            alert("Open an email first.");
            button.innerText = 'AI Reply';
            button.style.pointerEvents = 'auto';
            return;
        }

        try {
            const response = await fetch('http://localhost:8080/api/email/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailContent, tone })
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error("Backend error:", errText);
                alert("Backend failed. Check console.");
                return;
            }

            const reply = await response.text();
            const composeBox = document.querySelector('[role="textbox"][g_editable="true"]');
            if (!composeBox) {
                alert("Click reply box first.");
                return;
            }

            composeBox.focus();
            document.execCommand('insertText', false, `\n\n${reply}`);

        } catch (e) {
            console.error("AI Reply Error:", e);
            alert("Failed to generate AI reply.");
        } finally {
            button.innerText = 'AI Reply';
            button.style.pointerEvents = 'auto';
        }
    });

    // Inject dropdown + button
    toolbar.insertBefore(toneDropdown, toolbar.firstChild);
    toolbar.insertBefore(button, toolbar.firstChild);
}

/* ---------------- OBSERVER ---------------- */
const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
        const nodes = Array.from(mutation.addedNodes);
        const detected = nodes.some(n =>
            n.nodeType === Node.ELEMENT_NODE &&
            (n.matches('.btC,.aDh,[role="dialog"]') ||
             n.querySelector?.('.btC,.aDh,[role="dialog"]'))
        );
        if (detected) setTimeout(injectUI, 700);
    }
});

observer.observe(document.body, { childList: true, subtree: true });
