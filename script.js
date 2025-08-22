class RouletteWheel {
    constructor() {
        this.canvas = document.getElementById('wheel');
        this.ctx = this.canvas.getContext('2d');
        this.spinBtn = document.getElementById('spinBtn');
        this.shuffleBtn = document.getElementById('shuffleBtn');
        this.itemsTextarea = document.getElementById('itemsTextarea');
        this.modal = document.getElementById('resultModal');
        this.closeModal = document.getElementById('closeModal');
        this.resultText = document.getElementById('resultText');
        
        this.items = Array.from({length: 37}, (_, i) => i.toString());
        this.colors = [];
        this.currentRotation = 0;
        this.isSpinning = false;
        
        // 輪盤樣式參數（固定）
        this.trackWidth = 70;        // 外圍軌道總寬度
        this.outerRimWidth = 17;     // 外框寬度（淺咖啡色）
        this.innerTrackWidth = 53;   // 內軌道寬度（深咖啡色）
        
        // 輪盤持續旋轉相關
        this.wheelRotationSpeed = 0.005; // 輪盤基礎旋轉速度
        this.animationId = null;
        
        // 小球相關屬性
        this.ball = {
            angle: 0,
            radius: 0,  // 會在 getBallRadius() 中動態計算
            x: 0,
            y: 0,
            speed: 0,
            friction: 0.995,  // 增加摩擦力讓球在外圍轉更久
            dropSpeed: 0,     // 掉落速度
            isDropping: false, // 是否開始掉落
            finalSlot: -1,
            settling: false
        };
        
        this.init();
    }
    
    getBallTrackRadius() {
        // 小球在內軌道中央的位置
        const baseNumberRadius = 280;  // 配合調整
        return baseNumberRadius + (this.innerTrackWidth / 2);
    }
    
    init() {
        this.setupEventListeners();
        this.updateTextarea();
        this.updateColors();
        this.startAnimation();
    }
    
    setupEventListeners() {
        this.spinBtn.addEventListener('click', () => this.spin());
        this.shuffleBtn.addEventListener('click', () => this.shuffleItems());
        this.closeModal.addEventListener('click', () => this.hideModal());
        
        this.itemsTextarea.addEventListener('input', () => {
            this.updateItemsFromTextarea();
        });
    }
    
    updateColors() {
        this.colors = [];
        const itemCount = this.items.length;
        
        for (let i = 0; i < itemCount; i++) {
            if (itemCount % 2 === 1 && i === itemCount - 1) {
                this.colors.push('#00a65a');
            } else {
                this.colors.push(i % 2 === 0 ? '#dc3545' : '#343a40');
            }
        }
    }
    
    updateTextarea() {
        this.itemsTextarea.value = this.items.join('\n');
    }
    
    updateItemsFromTextarea() {
        const text = this.itemsTextarea.value.trim();
        if (text) {
            this.items = text.split('\n').filter(item => item.trim() !== '');
        } else {
            this.items = [];
        }
        this.updateColors();
        this.drawWheel();
    }
    
    shuffleItems() {
        for (let i = this.items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.items[i], this.items[j]] = [this.items[j], this.items[i]];
        }
        this.updateTextarea();
        this.drawWheel();
    }
    
    startAnimation() {
        const animate = () => {
            // 持續旋轉輪盤
            if (!this.isSpinning) {
                this.currentRotation += this.wheelRotationSpeed;
            }
            
            // 繪製輪盤
            this.drawWheel();
            
            // 如果正在旋轉，更新小球位置
            if (this.isSpinning) {
                this.updateBall();
            }
            
            // 繪製小球
            if (this.isSpinning || this.ball.radius < this.getBallTrackRadius()) {
                this.drawBall();
            }
            
            this.animationId = requestAnimationFrame(animate);
        };
        animate();
    }
    
    updateBall() {
        // 小球角度增加（相對於輪盤反向旋轉）
        this.ball.angle += this.ball.speed;
        
        // 減速
        this.ball.speed *= this.ball.friction;
        
        // 當速度減慢到一定程度時，開始掉落
        if (this.ball.speed < 0.02 && !this.ball.isDropping && !this.ball.settling) {
            this.ball.isDropping = true;
            this.ball.dropSpeed = 0.2;
        }
        
        // 如果正在掉落
        if (this.ball.isDropping) {
            // 加速掉落
            this.ball.dropSpeed += 0.03;
            this.ball.radius -= this.ball.dropSpeed;
            
            // 添加一些隨機彈跳（模擬球碰撞錐形和格子邊緣）
            if (Math.random() < 0.15 && this.ball.radius > 150 && this.ball.radius < 240) {
                this.ball.radius += Math.random() * 4;
                this.ball.speed += (Math.random() - 0.5) * 0.02;
                // 偶爾改變方向
                if (Math.random() < 0.3) {
                    this.ball.angle += (Math.random() - 0.5) * 0.1;
                }
            }
            
            // 當到達格子區域時，開始落入格子
            if (this.ball.radius <= 180) {  // 調整到格子區域的中間位置（放大1.5倍）
                this.ball.isDropping = false;
                this.ball.settling = true;
                this.settleBallInSlot();
            }
        }
        
        // 計算小球位置
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        this.ball.x = centerX + Math.cos(this.ball.angle) * this.ball.radius;
        this.ball.y = centerY + Math.sin(this.ball.angle) * this.ball.radius;
    }
    
    settleBallInSlot() {
        // 計算小球停留的格子
        const itemCount = this.items.length;
        if (itemCount === 0) {
            this.onSpinComplete();
            return;
        }
        
        const anglePerItem = (2 * Math.PI) / itemCount;
        
        // 計算小球相對於輪盤的角度
        const relativeAngle = (this.ball.angle - this.currentRotation) % (2 * Math.PI);
        const adjustedAngle = (relativeAngle + 2 * Math.PI + Math.PI / 2) % (2 * Math.PI);
        
        // 找到對應的格子
        const slotIndex = Math.floor(adjustedAngle / anglePerItem) % itemCount;
        
        // 計算目標角度（格子中心）
        const slotCenterAngle = (slotIndex * anglePerItem) + (anglePerItem / 2) - Math.PI / 2;
        const targetAngle = this.currentRotation + slotCenterAngle;
        
        // 計算最短路徑（避免轉圈）
        let angleDiff = targetAngle - this.ball.angle;
        
        // 正規化角度差到 -π 到 π 之間
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        // 平滑地將小球移動到格子中心
        const targetRadius = 180; // 格子區域的中間位置（放大1.5倍）
        const animateToSlot = () => {
            if (Math.abs(angleDiff) > 0.01 || Math.abs(this.ball.radius - targetRadius) > 1) {
                // 緩慢移動到目標角度
                if (Math.abs(angleDiff) > 0.01) {
                    const moveAmount = angleDiff * 0.15;
                    this.ball.angle += moveAmount;
                    angleDiff -= moveAmount;
                }
                
                // 調整半徑到格子中心
                if (this.ball.radius > targetRadius) {
                    this.ball.radius -= 0.5;
                } else if (this.ball.radius < targetRadius) {
                    this.ball.radius += 0.5;
                }
                
                requestAnimationFrame(animateToSlot);
            } else {
                this.ball.finalSlot = slotIndex;
                this.ball.radius = targetRadius; // 確保球在正確位置
                setTimeout(() => this.onSpinComplete(), 500);
            }
        };
        animateToSlot();
    }
    
    drawBall() {
        this.ctx.save();
        
        // 繪製陰影
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        // 繪製小球
        const ballSize = 12;
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, ballSize, 0, 2 * Math.PI);
        
        // 金屬質感漸變
        const gradient = this.ctx.createRadialGradient(
            this.ball.x - 4, this.ball.y - 4, 0,
            this.ball.x, this.ball.y, ballSize
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, '#e0e0e0');
        gradient.addColorStop(1, '#888888');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // 邊框
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 0.5;
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawWheel() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // 基礎半徑（固定大小）
        const baseNumberRadius = 280;  // 放大以填滿700x700 canvas
        const baseSlotRadius = 230;    // 對應放大
        const baseConeRadius = 175;    // 對應放大
        
        // 計算各層半徑
        const outerRadius = baseNumberRadius + this.trackWidth;  // 最外圍
        const rimInnerRadius = baseNumberRadius + this.innerTrackWidth;  // 外框內緣
        const numberRadius = baseNumberRadius;
        const slotRadius = baseSlotRadius;
        const coneRadius = baseConeRadius;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 先繪製整個軌道區域（深咖啡色背景）
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI);
        this.ctx.arc(centerX, centerY, numberRadius, 0, 2 * Math.PI, true);
        this.ctx.fillStyle = '#8B4513';  // 深咖啡色
        this.ctx.fill();
        
        // 再繪製外框（淺咖啡色）
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI);
        this.ctx.arc(centerX, centerY, rimInnerRadius, 0, 2 * Math.PI, true);
        this.ctx.fillStyle = '#D2B48C';  // 淺咖啡色
        this.ctx.fill();
        
        const itemCount = this.items.length;
        if (itemCount === 0) {
            // 沒有項目時的顯示
            this.ctx.fillStyle = '#2c5f2d';
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, numberRadius, 0, 2 * Math.PI);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('請輸入項目', centerX, centerY);
            
            // 繪製中心錐形
            this.drawCone(centerX, centerY, coneRadius);
            return;
        }
        
        const anglePerItem = (2 * Math.PI) / itemCount;
        
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(this.currentRotation);
        
        // 繪製格子區域（球會掉入的地方）
        for (let i = 0; i < itemCount; i++) {
            const startAngle = i * anglePerItem - Math.PI / 2;
            const endAngle = startAngle + anglePerItem;
            
            // 繪製格子（深色背景）
            this.ctx.beginPath();
            this.ctx.arc(0, 0, slotRadius, startAngle, endAngle);
            this.ctx.arc(0, 0, coneRadius, endAngle, startAngle, true);
            this.ctx.closePath();
            
            // 格子使用深色版本的顏色
            const baseColor = this.colors[i];
            let slotColor;
            if (baseColor === '#dc3545') { // 紅色
                slotColor = '#8b0000';
            } else if (baseColor === '#343a40') { // 黑色
                slotColor = '#1a1a1a';
            } else { // 綠色
                slotColor = '#004d26';
            }
            
            this.ctx.fillStyle = slotColor;
            this.ctx.fill();
            
            // 格子邊界
            this.ctx.strokeStyle = 'gold';
            this.ctx.lineWidth = 0.5;
            this.ctx.stroke();
            
            // 移除格子內的凹槽效果
        }
        
        // 繪製數字環（在格子上方）
        for (let i = 0; i < itemCount; i++) {
            const startAngle = i * anglePerItem - Math.PI / 2;
            const endAngle = startAngle + anglePerItem;
            
            // 繪製數字環扇形
            this.ctx.beginPath();
            this.ctx.arc(0, 0, numberRadius, startAngle, endAngle);
            this.ctx.arc(0, 0, slotRadius, endAngle, startAngle, true);
            this.ctx.closePath();
            
            this.ctx.fillStyle = this.colors[i];
            this.ctx.fill();
            
            // 數字環邊界
            this.ctx.strokeStyle = '#ffd700';
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
            
            // 繪製文字
            this.ctx.save();
            this.ctx.rotate(startAngle + anglePerItem / 2);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 24px Arial';  // 字體也放大
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            const text = this.items[i];
            const textRadius = (numberRadius + slotRadius) / 2;
            
            // 調整字體大小以適應空間
            if (this.ctx.measureText(text).width > 45) {
                this.ctx.font = 'bold 18px Arial';  // 對應放大
            }
            
            this.ctx.fillText(text, textRadius, 0);
            this.ctx.restore();
        }
        
        // 繪製分隔線（從中心到外圈）
        for (let i = 0; i < itemCount; i++) {
            const angle = i * anglePerItem - Math.PI / 2;
            this.ctx.beginPath();
            this.ctx.moveTo(Math.cos(angle) * coneRadius, Math.sin(angle) * coneRadius);
            this.ctx.lineTo(Math.cos(angle) * numberRadius, Math.sin(angle) * numberRadius);
            this.ctx.strokeStyle = '#ffd700';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
        
        this.ctx.restore();
        
        // 移除數字環外邊框
        
        // 繪製格子區域外邊框
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, slotRadius, 0, 2 * Math.PI);
        this.ctx.strokeStyle = '#8B7355';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // 繪製八等份分割線（只在內軌道深咖啡色部分）
        // 偏移 Math.PI/8 讓格子中心對齊12點鐘，而不是線對齊12點鐘
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8 + (Math.PI / 8);  // 偏移22.5度
            this.ctx.beginPath();
            this.ctx.moveTo(centerX + Math.cos(angle) * (numberRadius + 1), centerY + Math.sin(angle) * (numberRadius + 1));  // 只退1像素
            this.ctx.lineTo(centerX + Math.cos(angle) * rimInnerRadius, centerY + Math.sin(angle) * rimInnerRadius);
            this.ctx.strokeStyle = '#b8860b';  // 暗淡的金色
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        
        // 繪製每個軌道格子中間的菱形（一正一橫交替）
        const trackCenterRadius = (numberRadius + rimInnerRadius) / 2;  // 軌道中央位置
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8 - (Math.PI / 2);  // 第一個格子中心對齊12點鐘
            const centerX_diamond = centerX + Math.cos(angle) * trackCenterRadius;
            const centerY_diamond = centerY + Math.sin(angle) * trackCenterRadius;
            
            const diamondSize = 12;  // 菱形大小（放大1.5倍）
            const isVertical = i % 2 === 0;  // 奇數格子為正菱形，偶數格子為橫菱形
            
            // 橫菱形需要傳入角度來調整方向（沿著圓弧切線）
            this.drawDiamond(centerX_diamond, centerY_diamond, diamondSize, isVertical, angle);
        }
        
        // 繪製中心錐形（最後繪製，在最上層）
        this.drawCone(centerX, centerY, coneRadius);
    }
    
    drawDiamond(centerX, centerY, size, isVertical, angle = 0) {
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        
        if (!isVertical) {
            // 橫菱形需要根據弧度角度旋轉，讓長軸沿著圓弧切線方向
            // 切線方向是原角度 + 90度
            this.ctx.rotate(angle + Math.PI / 2);
        } else {
            // 正菱形也要根據角度旋轉，讓它指向圓心
            this.ctx.rotate(angle + Math.PI / 2);
        }
        
        this.ctx.beginPath();
        
        if (isVertical) {
            // 正菱形（徑向，指向圓心）
            this.ctx.moveTo(0, -size);          // 上
            this.ctx.lineTo(size/2, 0);         // 右
            this.ctx.lineTo(0, size);           // 下
            this.ctx.lineTo(-size/2, 0);        // 左
        } else {
            // 橫菱形（沿著圓弧切線）
            this.ctx.moveTo(-size, 0);          // 左
            this.ctx.lineTo(0, -size/2);        // 上
            this.ctx.lineTo(size, 0);           // 右
            this.ctx.lineTo(0, size/2);         // 下
        }
        
        this.ctx.closePath();
        this.ctx.fillStyle = '#ffd700';  // 金色填充
        this.ctx.fill();
        this.ctx.strokeStyle = '#b8860b';  // 暗金色邊框
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawCone(centerX, centerY, radius) {
        // 繪製錐形底座
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        const coneGradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        coneGradient.addColorStop(0, '#d4a76a');
        coneGradient.addColorStop(0.7, '#b8956a');
        coneGradient.addColorStop(1, '#8b7355');
        this.ctx.fillStyle = coneGradient;
        this.ctx.fill();
        
        // 繪製錐形邊框
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }
    
    spin() {
        if (this.isSpinning || this.items.length === 0) return;
        
        this.isSpinning = true;
        this.spinBtn.disabled = true;
        
        // 重置小球狀態
        this.ball.angle = Math.random() * Math.PI * 2;
        this.ball.radius = this.getBallTrackRadius();  // 在外圍軌道上
        this.ball.speed = 0.2 + Math.random() * 0.1; // 初始速度更快
        this.ball.dropSpeed = 0;
        this.ball.isDropping = false;
        this.ball.settling = false;
        this.ball.finalSlot = -1;
        
        // 加速輪盤旋轉
        this.wheelRotationSpeed = 0.02;
        
        // 逐漸減慢輪盤速度
        const slowDownWheel = () => {
            if (this.wheelRotationSpeed > 0.005) {
                this.wheelRotationSpeed *= 0.998;
                requestAnimationFrame(slowDownWheel);
            } else {
                this.wheelRotationSpeed = 0.005;
            }
        };
        setTimeout(slowDownWheel, 2000);
    }
    
    onSpinComplete() {
        this.isSpinning = false;
        this.spinBtn.disabled = false;
        
        if (this.ball.finalSlot >= 0 && this.ball.finalSlot < this.items.length) {
            this.showResult(this.items[this.ball.finalSlot]);
        }
        
        // 重置小球到外圈
        setTimeout(() => {
            this.ball.radius = this.getBallTrackRadius();
            this.ball.speed = 0;
        }, 2000);
    }
    
    showResult(item) {
        this.resultText.textContent = `抽中了：${item}`;
        this.modal.classList.add('show');
    }
    
    hideModal() {
        this.modal.classList.remove('show');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.roulette = new RouletteWheel();
});