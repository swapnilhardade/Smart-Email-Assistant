button.addEventListener('click', async () => {
    try {
        button.innerHTML = 'Generating...';
        button.disabled = true;

        const emailContent = getEmailContent();
        const tone = dropdown.value;

        if (!emailContent || emailContent.trim().length === 0) {
            console.warn("No email content found. Skipping generation.");
            alert("No email content detected. Please type or open an email first.");
            return;
        }

        let reply = '';
        try {
            const response = await fetch('http://localhost:8080/api/email/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailContent, tone })
            });

            if (!response.ok) {
                console.warn("API Request Failed:", response.status);
                alert("Failed to generate reply from API.");
                return;
            }

            reply = await response.text();
        } catch (fetchError) {
            console.error("Fetch error:", fetchError);
            alert("Error contacting the AI API. Is the backend running?");
            return;
        }

        const composeBox = document.querySelector('[role="textbox"][g_editable="true"]');
        if (!composeBox) {
            console.warn("Compose box not found");
            alert("Compose box not found. Please click into the reply box first.");
            return;
        }

        composeBox.focus();
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            selection.deleteFromDocument();
            selection.getRangeAt(0).insertNode(document.createTextNode(reply));
        } else {
            composeBox.innerHTML += reply;
        }

    } catch (error) {
        console.error("Unexpected Error:", error);
        alert("Unexpected error occurred. Check console for details.");
    } finally {
        button.innerHTML = 'AI_Reply';
        button.disabled = false;
    }
});
