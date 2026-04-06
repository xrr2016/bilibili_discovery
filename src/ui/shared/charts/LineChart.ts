/**
 * 折线图组件
 * 用于展示趋势数据的折线图
 */

import type { LineChartDataPoint, LineChartOptions } from './types.js';

export class LineChart {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: Required<LineChartOptions>;
  private data: LineChartDataPoint[] = [];
  private resizeObserver: ResizeObserver;

  constructor(canvas: HTMLCanvasElement | string, options: LineChartOptions = {}) {
    this.canvas = typeof canvas === 'string'
      ? document.getElementById(canvas)! as HTMLCanvasElement
      : canvas;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取Canvas上下文');
    }
    this.ctx = ctx;

    // 设置默认选项
    this.options = {
      title: options.title ?? '',
      maxValue: options.maxValue ?? 0,
      lineColor: options.lineColor ?? 'var(--theme-primary)',
      pointColor: options.pointColor ?? 'var(--theme-primary)',
      gridColor: options.gridColor ?? 'var(--theme-border-primary)',
      showPoints: options.showPoints ?? true,
      showTooltip: options.showTooltip ?? true,
      onPointClick: options.onPointClick ?? (() => {})
    };

    // 监听画布大小变化
    this.resizeObserver = new ResizeObserver(() => {
      this.render(this.data);
    });
    this.resizeObserver.observe(this.canvas);

    // 添加鼠标交互
    this.setupInteraction();
  }

  /**
   * 渲染折线图
   */
  render(data: LineChartDataPoint[]): void {
    console.log('[LineChart] 开始渲染,数据:', data);
    this.data = data;

    // 设置画布尺寸
    const rect = this.canvas.getBoundingClientRect();
    console.log('[LineChart] 画布尺寸:', rect);
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    console.log('[LineChart] 图表区域:', { width, height, chartWidth, chartHeight });

    // 清空画布
    this.ctx.clearRect(0, 0, width, height);

    if (data.length === 0) {
      console.log('[LineChart] 数据为空,显示空状态');
      this.drawEmptyState(width, height);
      return;
    }

    // 计算数据范围
    const maxValue = this.options.maxValue || Math.max(...data.map(d => d.value), 1);
    const minValue = 0;
    console.log('[LineChart] 数据范围:', { maxValue, minValue });

    // 绘制网格线和Y轴标签
    this.drawGridLines(chartHeight, chartWidth, padding, maxValue, minValue);

    // 绘制X轴标签
    this.drawXAxisLabels(data, chartWidth, chartHeight, padding);

    // 绘制渐变填充区域
    this.drawArea(data, chartWidth, chartHeight, padding, maxValue);

    // 绘制折线
    this.drawLine(data, chartWidth, chartHeight, padding, maxValue);

    // 绘制数据点
    if (this.options.showPoints) {
      this.drawPoints(data, chartWidth, chartHeight, padding, maxValue);
    }

    console.log('[LineChart] 渲染完成');
  }

  /**
   * 绘制网格线和Y轴标签
   */
  private drawGridLines(
    chartHeight: number,
    chartWidth: number,
    padding: { top: number; right: number; bottom: number; left: number },
    maxValue: number,
    minValue: number
  ): void {
    const gridCount = 4;
    this.ctx.strokeStyle = this.options.gridColor;
    this.ctx.lineWidth = 1;

    for (let i = 0; i <= gridCount; i++) {
      const y = padding.top + (chartHeight / gridCount) * i;

      // 绘制网格线
      this.ctx.beginPath();
      this.ctx.moveTo(padding.left, y);
      this.ctx.lineTo(this.canvas.width / window.devicePixelRatio - padding.right, y);
      this.ctx.stroke();

      // 绘制Y轴标签
      const value = maxValue - (maxValue / gridCount) * i;
      this.ctx.fillStyle = 'var(--theme-text-secondary)';
      this.ctx.font = '12px sans-serif';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(this.formatSeconds(value), padding.left - 10, y + 4);
    }
  }

  /**
   * 绘制X轴标签
   */
  private drawXAxisLabels(
    data: LineChartDataPoint[],
    chartWidth: number,
    chartHeight: number,
    padding: { top: number; right: number; bottom: number; left: number }
  ): void {
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = 'var(--theme-text-secondary)';
    this.ctx.font = '12px sans-serif';

    const stepX = chartWidth / (data.length - 1 || 1);

    for (let i = 0; i < data.length; i++) {
      const x = padding.left + stepX * i;
      const label = data[i].label;
      this.ctx.fillText(label, x, this.canvas.height / window.devicePixelRatio - padding.bottom + 20);
    }
  }

  /**
   * 绘制渐变填充区域
   */
  private drawArea(
    data: LineChartDataPoint[],
    chartWidth: number,
    chartHeight: number,
    padding: { top: number; right: number; bottom: number; left: number },
    maxValue: number
  ): void {
    const stepX = chartWidth / (data.length - 1 || 1);

    // 创建渐变
    const gradient = this.ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);

    // 检查是否是CSS变量，如果是则使用默认颜色
    let color = this.options.lineColor;
    if (color.startsWith('var(')) {
      color = '#3b82f6'; // 默认蓝色
    }

    // 将颜色转换为rgba格式
    let rgbaColor = color;
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      rgbaColor = `rgb(${r}, ${g}, ${b})`;
    }

    gradient.addColorStop(0, rgbaColor.replace('rgb', 'rgba').replace(')', ', 0.3)'));
    gradient.addColorStop(1, rgbaColor.replace('rgb', 'rgba').replace(')', ', 0)'));

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();

    // 从左下角开始
    this.ctx.moveTo(padding.left, padding.top + chartHeight);

    // 绘制所有数据点
    for (let i = 0; i < data.length; i++) {
      const x = padding.left + stepX * i;
      const y = padding.top + chartHeight - (data[i].value / maxValue) * chartHeight;
      this.ctx.lineTo(x, y);
    }

    // 到右下角
    this.ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);

    // 闭合路径
    this.ctx.closePath();
    this.ctx.fill();
  }

  /**
   * 解析颜色值，处理CSS变量
   */
  private parseColor(color: string): string {
    // 如果是CSS变量，使用默认颜色
    if (color.startsWith('var(')) {
      return '#3b82f6'; // 默认蓝色
    }
    return color;
  }

  /**
   * 绘制折线
   */
  private drawLine(
    data: LineChartDataPoint[],
    chartWidth: number,
    chartHeight: number,
    padding: { top: number; right: number; bottom: number; left: number },
    maxValue: number
  ): void {
    const stepX = chartWidth / (data.length - 1 || 1);
    const color = this.parseColor(this.options.lineColor);

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // 添加阴影效果
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 10;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 4;

    this.ctx.beginPath();

    for (let i = 0; i < data.length; i++) {
      const x = padding.left + stepX * i;
      const y = padding.top + chartHeight - (data[i].value / maxValue) * chartHeight;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        // 使用贝塞尔曲线使线条更平滑
        const prevX = padding.left + stepX * (i - 1);
        const prevY = padding.top + chartHeight - (data[i - 1].value / maxValue) * chartHeight;
        const cp1x = prevX + (x - prevX) / 2;
        const cp1y = prevY;
        const cp2x = prevX + (x - prevX) / 2;
        const cp2y = y;
        this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
      }
    }
    this.ctx.stroke();

    // 重置阴影
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
  }

  /**
   * 绘制数据点
   */
  private drawPoints(
    data: LineChartDataPoint[],
    chartWidth: number,
    chartHeight: number,
    padding: { top: number; right: number; bottom: number; left: number },
    maxValue: number
  ): void {
    const stepX = chartWidth / (data.length - 1 || 1);
    const color = this.parseColor(this.options.pointColor);

    for (let i = 0; i < data.length; i++) {
      const x = padding.left + stepX * i;
      const y = padding.top + chartHeight - (data[i].value / maxValue) * chartHeight;

      // 绘制外圈（白色背景）
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 6, 0, Math.PI * 2);
      this.ctx.fill();

      // 绘制内圈（主题色）
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  /**
   * 绘制空状态
   */
  private drawEmptyState(width: number, height: number): void {
    this.ctx.fillStyle = 'var(--theme-text-tertiary)';
    this.ctx.font = '14px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('暂无数据', width / 2, height / 2);
  }

  /**
   * 设置鼠标交互
   */
  private setupInteraction(): void {
    this.canvas.addEventListener('click', (e) => {
      if (!this.options.showTooltip || this.data.length === 0) return;

      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const padding = { top: 20, right: 20, bottom: 30, left: 50 };
      const chartWidth = rect.width - padding.left - padding.right;
      const chartHeight = rect.height - padding.top - padding.bottom;
      const stepX = chartWidth / (this.data.length - 1 || 1);
      const maxValue = this.options.maxValue || Math.max(...this.data.map(d => d.value), 1);

      // 查找最近的数据点
      let closestIndex = -1;
      let closestDistance = Infinity;

      for (let i = 0; i < this.data.length; i++) {
        const pointX = padding.left + stepX * i;
        const pointY = padding.top + chartHeight - (this.data[i].value / maxValue) * chartHeight;
        const distance = Math.sqrt((x - pointX) ** 2 + (y - pointY) ** 2);

        if (distance < closestDistance && distance < 10) { // 10px点击范围
          closestDistance = distance;
          closestIndex = i;
        }
      }

      if (closestIndex !== -1) {
        this.options.onPointClick(this.data[closestIndex]);
      }
    });
  }

  /**
   * 格式化秒数为 HH:MM:SS 格式
   */
  private formatSeconds(total: number): string {
    const safe = Math.max(0, Math.floor(total));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = safe % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener('click', () => {});
  }
}
