// Modal de corte para foto de perfil e fotos do usuário

const VIEWPORT_WIDTH = 300;
const VIEWPORT_HEIGHT = 475;
const OUTPUT_WIDTH = 800;
const OUTPUT_HEIGHT = 1267;
const MAX_ZOOM_FACTOR = 6;

// Dimensões para crop 1:1 (quadrado)
const VIEWPORT_WIDTH_1_1 = 300;
const VIEWPORT_HEIGHT_1_1 = 300;
const OUTPUT_WIDTH_1_1 = 800;
const OUTPUT_HEIGHT_1_1 = 800;

let cropState = null;
let cropResolve = null;
let cropAspectRatio = 'rectangular'; // 'rectangular' ou 'square'

function clampOffset(offset, viewportSize, drawSize) {
    if (drawSize <= viewportSize) {
        return (viewportSize - drawSize) / 2;
    }
    return Math.min(0, Math.max(viewportSize - drawSize, offset));
}

function getDrawSize(image, scale) {
    return {
        width: image.naturalWidth * scale,
        height: image.naturalHeight * scale
    };
}

function clampCropState() {
    if (!cropState) return;

    const { image, viewportWidth, viewportHeight } = cropState;
    const { width: drawW, height: drawH } = getDrawSize(image, cropState.scale);

    cropState.offsetX = clampOffset(cropState.offsetX, viewportWidth, drawW);
    cropState.offsetY = clampOffset(cropState.offsetY, viewportHeight, drawH);
}

function drawCropCanvas() {
    if (!cropState) return;

    const canvas = document.getElementById('crop-canvas');
    if (!canvas) return;

    const { image, scale, offsetX, offsetY, viewportWidth, viewportHeight } = cropState;
    const { width: drawW, height: drawH } = getDrawSize(image, scale);

    canvas.width = viewportWidth;
    canvas.height = viewportHeight;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, viewportWidth, viewportHeight);
    ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, offsetX, offsetY, drawW, drawH);
}

function initCropState(image) {
    const viewportWidth = cropAspectRatio === 'square' ? VIEWPORT_WIDTH_1_1 : VIEWPORT_WIDTH;
    const viewportHeight = cropAspectRatio === 'square' ? VIEWPORT_HEIGHT_1_1 : VIEWPORT_HEIGHT;
    const scaleX = viewportWidth / image.naturalWidth;
    const scaleY = viewportHeight / image.naturalHeight;
    const minScale = Math.max(scaleX, scaleY);

    const drawW = image.naturalWidth * minScale;
    const drawH = image.naturalHeight * minScale;

    cropState = {
        image,
        scale: minScale,
        minScale,
        maxScale: minScale * MAX_ZOOM_FACTOR,
        offsetX: (viewportWidth - drawW) / 2,
        offsetY: (viewportHeight - drawH) / 2,
        viewportWidth,
        viewportHeight,
        dragging: false,
        lastX: 0,
        lastY: 0
    };

    const zoomInput = document.getElementById('crop-zoom');
    if (zoomInput) {
        zoomInput.min = String(minScale);
        zoomInput.max = String(minScale * MAX_ZOOM_FACTOR);
        zoomInput.step = '0.01';
        zoomInput.value = String(minScale);
    }

    clampCropState();
    drawCropCanvas();
}

function setCropScale(scale) {
    if (!cropState) return;

    const centerX = cropState.viewportWidth / 2;
    const centerY = cropState.viewportHeight / 2;

    const imageX = (centerX - cropState.offsetX) / cropState.scale;
    const imageY = (centerY - cropState.offsetY) / cropState.scale;

    cropState.scale = scale;

    cropState.offsetX = centerX - imageX * scale;
    cropState.offsetY = centerY - imageY * scale;

    clampCropState();
    drawCropCanvas();
}

function startCropDrag(clientX, clientY) {
    if (!cropState) return;
    cropState.dragging = true;
    cropState.lastX = clientX;
    cropState.lastY = clientY;
}

function moveCropDrag(clientX, clientY) {
    if (!cropState || !cropState.dragging) return;

    cropState.offsetX += clientX - cropState.lastX;
    cropState.offsetY += clientY - cropState.lastY;
    cropState.lastX = clientX;
    cropState.lastY = clientY;

    clampCropState();
    drawCropCanvas();
}

function endCropDrag() {
    if (!cropState) return;
    cropState.dragging = false;
}

function exportCroppedBlob() {
    return new Promise((resolve, reject) => {
        if (!cropState) {
            reject(new Error('Nenhuma imagem para recortar.'));
            return;
        }

        const { image, scale, offsetX, offsetY, viewportWidth, viewportHeight } = cropState;
        const { width: drawW, height: drawH } = getDrawSize(image, scale);

        const sx = (-offsetX / drawW) * image.naturalWidth;
        const sy = (-offsetY / drawH) * image.naturalHeight;
        const sw = (viewportWidth / drawW) * image.naturalWidth;
        const sh = (viewportHeight / drawH) * image.naturalHeight;

        const outputWidth = cropAspectRatio === 'square' ? OUTPUT_WIDTH_1_1 : OUTPUT_WIDTH;
        const outputHeight = cropAspectRatio === 'square' ? OUTPUT_HEIGHT_1_1 : OUTPUT_HEIGHT;

        const output = document.createElement('canvas');
        output.width = outputWidth;
        output.height = outputHeight;

        const ctx = output.getContext('2d');
        ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);

        output.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Não foi possível gerar a imagem recortada.'));
        }, 'image/webp', 0.85);
    });
}

function closeCropModal(result = null) {
    const modal = document.getElementById('avatar-crop-modal');
    if (modal) modal.classList.add('hidden');

    if (cropState?.objectUrl) {
        URL.revokeObjectURL(cropState.objectUrl);
    }

    cropState = null;

    if (cropResolve) {
        cropResolve(result);
        cropResolve = null;
    }
}

function setupCropListeners() {
    const modal = document.getElementById('avatar-crop-modal');
    const viewport = document.getElementById('crop-viewport');
    const zoomInput = document.getElementById('crop-zoom');
    const btnCancel = document.getElementById('crop-cancel');
    const btnConfirm = document.getElementById('crop-confirm');
    const backdrop = modal?.querySelector('.crop-modal-backdrop');
    const aspectSelector = document.getElementById('crop-aspect-selector');

    if (!modal || !viewport) return;

    viewport.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startCropDrag(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e) => {
        moveCropDrag(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', endCropDrag);

    viewport.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        startCropDrag(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    viewport.addEventListener('touchmove', (e) => {
        if (e.touches.length !== 1) return;
        moveCropDrag(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    viewport.addEventListener('touchend', endCropDrag);

    if (zoomInput) {
        zoomInput.addEventListener('input', (e) => {
            setCropScale(parseFloat(e.target.value));
        });
    }

    if (aspectSelector) {
        aspectSelector.addEventListener('click', (e) => {
            const btn = e.target.closest('.aspect-btn');
            if (!btn) return;

            const aspect = btn.dataset.aspect;
            if (!aspect) return;

            // Atualizar botões ativos
            aspectSelector.querySelectorAll('.aspect-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Atualizar classe do viewport
            if (viewport) {
                if (aspect === 'square') {
                    viewport.classList.add('square');
                } else {
                    viewport.classList.remove('square');
                }
            }

            // Atualizar aspect ratio e reiniciar
            cropAspectRatio = aspect;
            if (cropState?.image) {
                initCropState(cropState.image);
            }
        });
    }

    if (btnCancel) {
        btnCancel.addEventListener('click', () => closeCropModal(null));
    }

    if (backdrop) {
        backdrop.addEventListener('click', () => closeCropModal(null));
    }

    if (btnConfirm) {
        btnConfirm.addEventListener('click', async () => {
            try {
                btnConfirm.disabled = true;
                const blob = await exportCroppedBlob();
                closeCropModal(blob);
            } catch (error) {
                alert(error.message || 'Erro ao recortar imagem.');
            } finally {
                btnConfirm.disabled = false;
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', setupCropListeners);

export function openAvatarCropModal(file, aspectRatio = 'rectangular') {
    return new Promise((resolve, reject) => {
        const modal = document.getElementById('avatar-crop-modal');
        if (!modal) {
            reject(new Error('Modal de corte não encontrado.'));
            return;
        }

        cropAspectRatio = aspectRatio;

        // Mostrar/ocultar seletor de aspect ratio
        const aspectSelector = document.getElementById('crop-aspect-selector');
        if (aspectSelector) {
            aspectSelector.style.display = aspectRatio === 'square' ? 'flex' : 'none';

            // Atualizar botões ativos
            aspectSelector.querySelectorAll('.aspect-btn').forEach(b => {
                b.classList.remove('active');
                if (b.dataset.aspect === aspectRatio) {
                    b.classList.add('active');
                }
            });
        }

        // Atualizar classe do viewport
        const viewport = document.getElementById('crop-viewport');
        if (viewport) {
            if (aspectRatio === 'square') {
                viewport.classList.add('square');
            } else {
                viewport.classList.remove('square');
            }
        }

        const objectUrl = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            cropResolve = resolve;
            cropState = { objectUrl };
            initCropState(image);
            modal.classList.remove('hidden');
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Não foi possível carregar a imagem.'));
        };

        image.src = objectUrl;
    });
}
