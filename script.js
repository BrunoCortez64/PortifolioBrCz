/* ============================================================
   BRUNO CORTEZ — PORTFÓLIO
   Interações: partículas, reveals, spotlight, magnetismo,
   cursor customizado, parallax, navegação
   ============================================================ */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;

/* ---------- Partículas ---------- */
document.addEventListener('DOMContentLoaded', () => {
    if (window.particlesJS && !reduceMotion) {
        particlesJS.load('particles-js', 'assets/particles.json');
    }
});

/* ---------- Revelação ao rolar (IntersectionObserver) ----------
   threshold: 0 — dispara assim que o 1º pixel entra, independente da
   altura do alvo. Um threshold por área (ex.: 0.12) falha em seções
   muito altas (ex.: #projects empilhada no mobile, ~6300px): exigiria
   ~760px visíveis de uma vez, o que nunca acontece durante a rolagem
   normal e a seção fica presa em opacity:0 (parecendo "vazia"). */
const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in');

            /* após a entrada terminar, remove a transição do stagger para
               liberar os transforms de hover/magnetismo dos filhos */
            entry.target.querySelectorAll('[data-stagger]').forEach(container => {
                const maxDelay = parseInt(container.dataset.maxDelay || '0', 10);
                setTimeout(() => container.classList.add('stagger-done'), maxDelay + 800);
            });

            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* stagger: atraso incremental nos filhos dos grids */
document.querySelectorAll('[data-stagger]').forEach(container => {
    let maxDelay = 0;
    [...container.children].forEach((child, i) => {
        const delay = Math.min(i * 70, 560);
        maxDelay = Math.max(maxDelay, delay);
        child.style.setProperty('--d', `${delay}ms`);
    });
    container.dataset.maxDelay = String(maxDelay);
});

/* ---------- Spotlight nos cards (segue o mouse) ---------- */
if (finePointer && !reduceMotion) {
    document.querySelectorAll('.spot').forEach(card => {
        card.addEventListener('pointermove', e => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
            card.style.setProperty('--my', `${e.clientY - rect.top}px`);
        });
    });
}

/* ---------- Botões magnéticos ----------
   Física com rAF + lerp. O ponto-chave: getBoundingClientRect() inclui o
   translate atual — subtraímos o deslocamento aplicado para achar o centro
   real, evitando o loop de feedback que travava a animação. */
if (finePointer && !reduceMotion) {
    const STRENGTH = 0.22;
    const MAX_OFFSET = 12;
    const clamp = (v, max) => Math.max(-max, Math.min(max, v));

    document.querySelectorAll('.magnetic').forEach(el => {
        let targetX = 0, targetY = 0;   // para onde o elemento quer ir
        let currentX = 0, currentY = 0; // onde ele está agora
        let rafId = null;

        function loop() {
            currentX += (targetX - currentX) * 0.18;
            currentY += (targetY - currentY) * 0.18;

            if (Math.abs(targetX - currentX) < 0.1 && Math.abs(targetY - currentY) < 0.1) {
                currentX = targetX;
                currentY = targetY;
            }

            el.style.transform = (currentX === 0 && currentY === 0)
                ? ''
                : `translate(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px)`;

            if (currentX !== targetX || currentY !== targetY) {
                rafId = requestAnimationFrame(loop);
            } else {
                rafId = null;
            }
        }

        function start() {
            if (rafId === null) rafId = requestAnimationFrame(loop);
        }

        el.addEventListener('pointermove', e => {
            const rect = el.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2 - currentX;
            const centerY = rect.top + rect.height / 2 - currentY;
            targetX = clamp((e.clientX - centerX) * STRENGTH, MAX_OFFSET);
            targetY = clamp((e.clientY - centerY) * STRENGTH, MAX_OFFSET);
            start();
        });

        el.addEventListener('pointerleave', () => {
            targetX = 0;
            targetY = 0;
            start();
        });
    });
}

/* ---------- Lightbox holográfico (Mind the Gap) ---------- */
(function mtgLightbox() {
    const lightbox = document.getElementById('mtg-lightbox');
    const opener = document.getElementById('mtg-expand');
    if (!lightbox || !opener) return;

    const closeBtn = lightbox.querySelector('.lightbox-close');
    const backdrop = lightbox.querySelector('.lightbox-backdrop');
    const CLOSE_MS = reduceMotion ? 0 : 300;

    function open() {
        lightbox.classList.remove('closing');
        lightbox.hidden = false;
        document.body.style.overflow = 'hidden';
        closeBtn.focus();
    }

    function close() {
        lightbox.classList.add('closing');
        setTimeout(() => {
            lightbox.hidden = true;
            lightbox.classList.remove('closing');
            document.body.style.overflow = '';
            opener.focus();
        }, CLOSE_MS);
    }

    opener.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !lightbox.hidden && !lightbox.classList.contains('closing')) close();
    });
})();

/* ---------- Accordion suave (cursos) ---------- */
(function smoothAccordions() {
    if (reduceMotion) return; // toggle nativo instantâneo

    document.querySelectorAll('details.courses-group').forEach(details => {
        const summary = details.querySelector('summary');
        let animation = null;
        let expanding = false;
        let closing = false;

        function finish(open) {
            details.open = open;
            animation = null;
            expanding = closing = false;
            details.style.height = '';
            details.style.overflow = '';
            details.classList.remove('animating');
        }

        function animateTo(startH, endH, open) {
            if (animation) animation.cancel();
            details.classList.add('animating');
            animation = details.animate(
                { height: [`${startH}px`, `${endH}px`] },
                { duration: 380, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
            );
            animation.onfinish = () => finish(open);
            animation.oncancel = () => { expanding = closing = false; };
        }

        summary.addEventListener('click', e => {
            e.preventDefault();
            details.style.overflow = 'hidden';

            if (closing || !details.open) {
                // abrir: fixa a altura fechada, marca open e anima até a altura cheia
                expanding = true;
                details.style.height = `${details.offsetHeight}px`;
                details.open = true;
                requestAnimationFrame(() => {
                    const start = details.offsetHeight;
                    const end = summary.offsetHeight + details.querySelector('.courses-list').offsetHeight;
                    animateTo(start, end, true);
                });
            } else if (expanding || details.open) {
                // fechar: anima até a altura do summary
                closing = true;
                animateTo(details.offsetHeight, summary.offsetHeight, false);
            }
        });
    });
})();

/* ---------- Cursor customizado ---------- */
if (finePointer && !reduceMotion) {
    const dot = document.querySelector('.cursor-dot');
    const ring = document.querySelector('.cursor-ring');
    let mouseX = -100, mouseY = -100;
    let ringX = -100, ringY = -100;
    let started = false;

    document.addEventListener('pointermove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (!started) {
            started = true;
            ringX = mouseX;
            ringY = mouseY;
            document.body.classList.add('cursor-active');
        }
    });

    document.addEventListener('pointerleave', () => {
        document.body.classList.remove('cursor-active');
        started = false;
    });

    (function animateCursor() {
        ringX += (mouseX - ringX) * 0.16;
        ringY += (mouseY - ringY) * 0.16;
        dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
        ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
        requestAnimationFrame(animateCursor);
    })();

    document.querySelectorAll('a, button, summary').forEach(el => {
        el.addEventListener('pointerenter', () => document.body.classList.add('cursor-hovering'));
        el.addEventListener('pointerleave', () => document.body.classList.remove('cursor-hovering'));
    });
}

/* ---------- Subtítulo digitado (hero) ---------- */
(function typedRoles() {
    const el = document.getElementById('typed-role');
    if (!el) return;

    const roles = [
        'Full-Stack Developer',
        'Information Security Analyst',
        'IAM · IGA & PAM',
        'Engenheiro da Computação',
        'React, Node.js & Spring Boot'
    ];

    if (reduceMotion) {
        el.textContent = roles[0];
        return;
    }

    let roleIndex = 0;
    let charIndex = roles[0].length;
    let deleting = false;

    function tick() {
        const current = roles[roleIndex];

        if (deleting) {
            charIndex--;
            el.textContent = current.slice(0, charIndex);
            if (charIndex === 0) {
                deleting = false;
                roleIndex = (roleIndex + 1) % roles.length;
                setTimeout(tick, 350);
                return;
            }
            setTimeout(tick, 32);
        } else {
            charIndex++;
            el.textContent = current.slice(0, charIndex);
            if (charIndex === current.length) {
                deleting = true;
                setTimeout(tick, 2400);
                return;
            }
            setTimeout(tick, 58);
        }
    }

    setTimeout(() => { deleting = true; tick(); }, 2600);
})();

/* ---------- Parallax dos orbes ---------- */
if (!reduceMotion) {
    const orbs = document.querySelectorAll('.orb');
    let ticking = false;

    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const y = window.scrollY;
            orbs.forEach(orb => {
                const depth = parseFloat(orb.dataset.depth || 0.3);
                orb.style.translate = `0 ${y * depth * 0.4}px`;
            });
            ticking = false;
        });
    }, { passive: true });
}

/* ---------- Navegação: progresso, link ativo, menu mobile ---------- */
(function navigation() {
    const progress = document.getElementById('nav-progress');
    const navLinks = document.querySelectorAll('.nav-links a');
    const toggle = document.getElementById('nav-toggle');
    const linksBox = document.getElementById('nav-links');

    /* barra de progresso de rolagem */
    window.addEventListener('scroll', () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.width = `${(window.scrollY / max) * 100}%`;
    }, { passive: true });

    /* destaque do link da seção visível */
    const sections = document.querySelectorAll('header[id], section[id]');
    const linkFor = id => document.querySelector(`.nav-links a[href="#${id}"]`);

    const sectionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navLinks.forEach(a => a.classList.remove('active'));
                const link = linkFor(entry.target.id);
                if (link) link.classList.add('active');
            }
        });
    }, { rootMargin: '-40% 0px -55% 0px' });

    sections.forEach(s => sectionObserver.observe(s));

    /* menu mobile */
    toggle.addEventListener('click', () => {
        const open = linksBox.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    });

    navLinks.forEach(a => a.addEventListener('click', () => {
        linksBox.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
    }));
})();

/* ---------- Rolagem suave ---------- */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    });
});
