package in.obele.app.code_gen_export.common.views;

import android.content.Context;
import android.graphics.Point;
import android.graphics.Rect;
import android.os.Build;
import android.text.Layout;
import android.text.StaticLayout;
import android.text.TextPaint;
import android.util.AttributeSet;
import android.util.DisplayMetrics;
import android.util.TypedValue;
import android.view.Display;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.constraintlayout.widget.ConstraintLayout;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import java.util.IdentityHashMap;
import java.util.Map;

/**
 * FrameLayout version of design scaling:
 * - Descendant layout params are scaled before measurement.
 * - View bounds match the scaled result instead of relying on transform-only scaling.
 *
 * With designItemWidth/Height (e.g. RecyclerView item): size is designItem/designRoot
 * of the screen. On tablet / foldable, width follows root letterbox (scaleH * factor)
 * unless designFillDeviceWidth / phone fill-width behavior applies.
 *
 * Without designItem (full-screen root): may letterbox on wide / foldable screens
 * (tablet / unfolded foldable: smallestScreenWidthDp >= 600).
 * Set designFillDeviceWidth=true to use the full available device width.
 *
 * Phone (smallestScreenWidthDp < 600) ignores designWideWidthFactor /
 * designFillDeviceWidth and always behaves as factor=1.0 + fillDeviceWidth=true.
 *
 * Optional XML attrs (app namespace): app:designRootWidth, app:designRootHeight,
 * app:designItemWidth, app:designItemHeight, app:designItemScaleWidthByHeight,
 * app:designWideWidthFactor, app:designFillDeviceWidth,
 * app:designExtendToTop, app:designExtendToBottom,
 * app:designAutoSizeMinTextSize, app:designAutoSizeMaxTextSize.
 */
public class DesignScaleFrameLayout extends FrameLayout {

    private static final String NAMESPACE = "http://schemas.android.com/apk/res-auto";
    /** Tablet / foldable threshold (Android sw600dp). */
    private static final int LARGE_SCREEN_SMALLEST_WIDTH_DP = 600;
    /** Tablet / foldable width multiplier; 1.2f makes content 20% wider than phone letterbox width. */
    private static final float DEFAULT_WIDE_WIDTH_FACTOR = 1.2f;
    /** Tablet / foldable fill-width flag; true makes content use the full device width. */
    private static final boolean DEFAULT_FILL_DEVICE_WIDTH = false;
    /** Full-screen root may extend into the status bar overlap when true. */
    private static final boolean DEFAULT_EXTEND_TO_TOP = false;
    /** Full-screen root may extend into the navigation bar overlap when true. */
    private static final boolean DEFAULT_EXTEND_TO_BOTTOM = false;
    /** Minimum fontScale multiplier applied to the starting TextView/EditText textSize. */
    private static final float DEFAULT_AUTO_SIZE_MIN_TEXT_SIZE = 0.8f;
    /** Maximum fontScale multiplier applied to the starting TextView/EditText textSize. */
    private static final float DEFAULT_AUTO_SIZE_MAX_TEXT_SIZE = 1.2f;
    /** Align Compose AutoSizeText slackConstraints: avoid clipping the last glyph. */
    private static final int AUTO_SIZE_WIDTH_SLACK_PX = 4;
    /** Align Compose minFontSize = 1.sp; overflow fit may shrink down to this. */
    private static final float AUTO_SIZE_FIT_MIN_TEXT_SIZE_SP = 1f;
    /** Binary-search iterations for overflow fit (same as UIKit AutoSizeLabel). */
    private static final int AUTO_SIZE_FIT_ITERATIONS = 18;

    private final DisplayMetrics dm = getResources().getDisplayMetrics();

    private float designRootWidth = 0f;
    private float designRootHeight = 0f;
    private float designItemWidth = 0f;
    private float designItemHeight = 0f;
    private boolean hasDesignItemSize = false;
    private boolean designItemScaleWidthByHeight = false;
    private int designRootWidthPx = 0;
    private int designRootHeightPx = 0;
    private int designItemWidthPx = 0;
    private int designItemHeightPx = 0;
    private float scaleH = 1f;
    private float scaleW = 1f;
    private float designWideWidthFactor = DEFAULT_WIDE_WIDTH_FACTOR;
    private boolean designFillDeviceWidth = DEFAULT_FILL_DEVICE_WIDTH;
    private boolean designExtendToTop = DEFAULT_EXTEND_TO_TOP;
    private boolean designExtendToBottom = DEFAULT_EXTEND_TO_BOTTOM;
    private float autoSizeMinTextSize = DEFAULT_AUTO_SIZE_MIN_TEXT_SIZE;
    private float autoSizeMaxTextSize = DEFAULT_AUTO_SIZE_MAX_TEXT_SIZE;
    private int contentOffsetX = 0;
    private int contentOffsetY = 0;
    private int contentWidthPx = 0;
    private int contentHeightPx = 0;
    private int systemWindowInsetTopPx = 0;
    private int systemWindowInsetBottomPx = 0;
    private final Map<View, OriginalViewState> originalViewStates = new IdentityHashMap<>();
    private final int[] locationOnScreen = new int[2];
    private final int[] rootLocationOnScreen = new int[2];
    private final Rect windowBounds = new Rect();
    /** True when overlap was estimated before a stable on-screen position existed. */
    private boolean pendingOverlapRelayout = false;

    public DesignScaleFrameLayout(@NonNull Context context) {
        super(context);
    }

    public DesignScaleFrameLayout(@NonNull Context context, @Nullable AttributeSet attrs) {
        super(context, attrs);
        init(attrs);
    }

    public DesignScaleFrameLayout(
            @NonNull Context context,
            @Nullable AttributeSet attrs,
            int defStyleAttr
    ) {
        super(context, attrs, defStyleAttr);
        init(attrs);
    }

    private void init(@Nullable AttributeSet attrs) {
        if (attrs == null) {
            return;
        }

        // AAPT encodes "392" as TYPE_INT and "392.0" as TYPE_FLOAT.
        // AttributeSet.getAttributeFloatValue throws on non-float, so parse as string.
        designRootWidth = readAttrFloat(attrs, "designRootWidth", 0f);
        designRootHeight = readAttrFloat(attrs, "designRootHeight", 0f);
        hasDesignItemSize = attrs.getAttributeValue(NAMESPACE, "designItemWidth") != null
                && attrs.getAttributeValue(NAMESPACE, "designItemHeight") != null;
        designItemWidth = readAttrFloat(attrs, "designItemWidth", 0f);
        designItemHeight = readAttrFloat(attrs, "designItemHeight", 0f);
        designItemScaleWidthByHeight = readAttrBoolean(attrs, "designItemScaleWidthByHeight", false);
        designWideWidthFactor = Math.max(
                1f,
                readAttrFloat(attrs, "designWideWidthFactor", DEFAULT_WIDE_WIDTH_FACTOR)
        );
        designFillDeviceWidth = readAttrBoolean(
                attrs,
                "designFillDeviceWidth",
                DEFAULT_FILL_DEVICE_WIDTH
        );
        designExtendToTop = readAttrBoolean(attrs, "designExtendToTop", DEFAULT_EXTEND_TO_TOP);
        designExtendToBottom = readAttrBoolean(
                attrs,
                "designExtendToBottom",
                DEFAULT_EXTEND_TO_BOTTOM
        );
        autoSizeMinTextSize = Math.max(
                0f,
                readAttrFloat(attrs, "designAutoSizeMinTextSize", DEFAULT_AUTO_SIZE_MIN_TEXT_SIZE)
        );
        autoSizeMaxTextSize = Math.max(
                autoSizeMinTextSize,
                readAttrFloat(attrs, "designAutoSizeMaxTextSize", DEFAULT_AUTO_SIZE_MAX_TEXT_SIZE)
        );
        designRootWidthPx = Math.max(1, Math.round(designRootWidth * dm.density));
        designRootHeightPx = Math.max(1, Math.round(designRootHeight * dm.density));
        if (hasDesignItemSize) {
            designItemWidthPx = Math.max(1, Math.round(designItemWidth * dm.density));
            designItemHeightPx = Math.max(1, Math.round(designItemHeight * dm.density));
        }

        updateScales(dm.widthPixels, getAvailableScreenHeightPx());
    }

    @Override
    @SuppressWarnings("deprecation")
    public WindowInsets onApplyWindowInsets(WindowInsets insets) {
        int oldTop = systemWindowInsetTopPx;
        int oldBottom = systemWindowInsetBottomPx;
        refreshSystemWindowInsets();
        if (oldTop != systemWindowInsetTopPx || oldBottom != systemWindowInsetBottomPx) {
            requestLayout();
        }
        return super.onApplyWindowInsets(insets);
    }

    /**
     * Prefer root window insets so RecyclerView items (which often never receive
     * {@link #onApplyWindowInsets}) still get status / nav bar sizes.
     */
    private void refreshSystemWindowInsets() {
        WindowInsetsCompat rootInsets = ViewCompat.getRootWindowInsets(this);
        if (rootInsets == null) {
            return;
        }
        Insets systemBars = rootInsets.getInsets(WindowInsetsCompat.Type.systemBars());
        systemWindowInsetTopPx = systemBars.top;
        systemWindowInsetBottomPx = systemBars.bottom;
    }

    /**
     * True window/frame height (includes system bars under edge-to-edge).
     * Prefer WindowMetrics over {@link DisplayMetrics#heightPixels}, which on some
     * devices already excludes the nav bar and causes double-subtraction.
     */
    private int getWindowHeightPx() {
        fillWindowBounds(windowBounds);
        if (windowBounds.height() > 0) {
            return windowBounds.height();
        }
        return Math.max(1, dm.heightPixels);
    }

    @SuppressWarnings("deprecation")
    private void fillWindowBounds(@NonNull Rect out) {
        out.setEmpty();
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowManager wm = context.getSystemService(WindowManager.class);
            if (wm != null) {
                out.set(wm.getCurrentWindowMetrics().getBounds());
                return;
            }
        }
        WindowManager wm = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        if (wm != null) {
            Display display = wm.getDefaultDisplay();
            if (display != null) {
                Point realSize = new Point();
                display.getRealSize(realSize);
                out.set(0, 0, realSize.x, realSize.y);
            }
        }
    }

    private int getAvailableScreenHeightPx() {
        refreshSystemWindowInsets();
        return Math.max(
                1,
                getWindowHeightPx() - systemWindowInsetTopPx - systemWindowInsetBottomPx
        );
    }

    /**
     * How much of the system bars overlap this view's bounds.
     * <p>
     * Edge-to-edge + 3-button: MeasureSpec is the full window → deduct top/bottom.
     * Gesture / already-safe MeasureSpec / parent-padded: do not deduct again
     * (avoids "height too small" from double-counting).
     */
    private int[] getSystemBarOverlapPx(int viewHeightPx) {
        refreshSystemWindowInsets();
        if (systemWindowInsetTopPx == 0 && systemWindowInsetBottomPx == 0) {
            return new int[] { 0, 0 };
        }
        if (viewHeightPx <= 0) {
            return new int[] { systemWindowInsetTopPx, systemWindowInsetBottomPx };
        }

        // After at least one layout, on-screen position is trustworthy.
        // During the first measure/layout pass, location is often (0,0) even when
        // the view will sit in the safe area — that falsely reported full overlap.
        if (isAttachedToWindow() && isLaidOut()) {
            getLocationOnScreen(locationOnScreen);
            int viewTop = locationOnScreen[1];
            int viewBottom = viewTop + viewHeightPx;

            int windowTopOnScreen = 0;
            int windowHeight = getWindowHeightPx();
            View root = getRootView();
            if (root != null && root != this) {
                root.getLocationOnScreen(rootLocationOnScreen);
                windowTopOnScreen = rootLocationOnScreen[1];
                if (root.getHeight() > 0) {
                    windowHeight = root.getHeight();
                }
            }

            int safeTop = windowTopOnScreen + systemWindowInsetTopPx;
            int safeBottom = windowTopOnScreen + windowHeight - systemWindowInsetBottomPx;
            int topOverlap = Math.max(0, Math.min(viewHeightPx, safeTop - viewTop));
            int bottomOverlap = Math.max(
                    0,
                    Math.min(viewHeightPx - topOverlap, viewBottom - safeBottom)
            );
            return new int[] { topOverlap, bottomOverlap };
        }

        // Pre-layout heuristic based on MeasureSpec vs window/safe height.
        pendingOverlapRelayout = true;
        int windowHeight = getWindowHeightPx();
        int safeHeight = Math.max(
                1,
                windowHeight - systemWindowInsetTopPx - systemWindowInsetBottomPx
        );
        // Full window (typical edge-to-edge): deduct system bars.
        if (viewHeightPx >= windowHeight - 2) {
            return new int[] { systemWindowInsetTopPx, systemWindowInsetBottomPx };
        }
        // Already at/below safe height: parent or platform already inset us.
        if (viewHeightPx <= safeHeight + 2) {
            return new int[] { 0, 0 };
        }
        // Between safe and full: deduct only the excess (usually nav bar).
        int excess = viewHeightPx - safeHeight;
        int bottomOverlap = Math.min(excess, systemWindowInsetBottomPx);
        int topOverlap = Math.min(excess - bottomOverlap, systemWindowInsetTopPx);
        return new int[] { topOverlap, bottomOverlap };
    }

    private int[] adjustRootOverlapForExtendEdges(@NonNull int[] overlap) {
        return new int[] {
                designExtendToTop ? 0 : overlap[0],
                designExtendToBottom ? 0 : overlap[1]
        };
    }

    private void updateScales(int availableWidth, int availableHeight) {
        if (designRootWidthPx <= 0 || designRootHeightPx <= 0
                || availableWidth <= 0 || availableHeight <= 0) {
                    scaleW = 1f;
                    scaleH = 1f;
                    contentOffsetX = 0;
                    contentWidthPx = Math.max(0, availableWidth);
                    contentHeightPx = Math.max(0, availableHeight);
                    return;
        }

        // designItem: size is designItem/designRoot of the screen.
        // On tablet / foldable, match root letterbox width unless fillDeviceWidth.
        if (hasDesignItemSize) {
            scaleW = (float) availableWidth / (float) designRootWidthPx;
            scaleH = (float) availableHeight / (float) designRootHeightPx;

            boolean phoneDevice = isPhoneDevice();
            boolean fillWidth = phoneDevice || designFillDeviceWidth;
            float wideFactor = phoneDevice ? 1.0f : designWideWidthFactor;

            if (designItemScaleWidthByHeight) {
                scaleW = scaleH;
            } else if (!fillWidth) {
                // Same as root letterbox: phoneContentWidth = designRootWidth * scaleH * factor.
                scaleW = scaleH * wideFactor;
            }

            contentOffsetX = 0;
            contentWidthPx = Math.max(1, Math.round(designItemWidthPx * scaleW));
            contentHeightPx = Math.max(1, Math.round(designItemHeightPx * scaleH));
            return;
        }

        float rawScaleW = (float) availableWidth / (float) designRootWidthPx;
        float rawScaleH = (float) availableHeight / (float) designRootHeightPx;

        // Phone always fills device width (factor=1.0, fill=true), ignoring XML / defaults.
        boolean phoneDevice = isPhoneDevice();
        boolean fillWidth = phoneDevice || designFillDeviceWidth;
        float wideFactor = phoneDevice ? 1.0f : designWideWidthFactor;

        if (rawScaleW > rawScaleH) {
            // Wider than design (tablet / unfolded foldable): letterbox, allow phoneWidth * factor.
            scaleH = rawScaleH;
            float phoneContentWidthPx = designRootWidthPx * scaleH;
            float targetContentWidthPx = fillWidth
                    ? availableWidth
                    : Math.min(
                            availableWidth,
                            phoneContentWidthPx * wideFactor
                    );
            scaleW = targetContentWidthPx / (float) designRootWidthPx;
            contentHeightPx = availableHeight;
            contentWidthPx = Math.max(1, Math.round(targetContentWidthPx));
            contentOffsetX = Math.max(0, (availableWidth - contentWidthPx) / 2);
        } else {
            // Matching / taller aspect: keep independent W/H scale (full available size).
            scaleW = rawScaleW;
            scaleH = rawScaleH;
            contentOffsetX = 0;
            contentWidthPx = availableWidth;
            contentHeightPx = availableHeight;
        }
    }

    /** Phone = smallestScreenWidthDp < 600; tablet / foldable otherwise. */
    private boolean isPhoneDevice() {
        return getResources().getConfiguration().smallestScreenWidthDp
                < LARGE_SCREEN_SMALLEST_WIDTH_DP;
    }

    private static float readAttrFloat(@NonNull AttributeSet attrs, @NonNull String name, float defValue) {
        String raw = attrs.getAttributeValue(NAMESPACE, name);
        if (raw == null || raw.isEmpty()) {
            return defValue;
        }
        try {
            return Float.parseFloat(raw);
        } catch (NumberFormatException ignored) {
            return defValue;
        }
    }

    private static boolean readAttrBoolean(@NonNull AttributeSet attrs, @NonNull String name, boolean defValue) {
        String raw = attrs.getAttributeValue(NAMESPACE, name);
        if (raw == null || raw.isEmpty()) {
            return defValue;
        }
        return Boolean.parseBoolean(raw);
    }

    private int scaleWidthDimension(int value) {
        if (value < 0) {
            return value;
        }
        if (value == 0) {
            return 0;
        }
        return Math.max(1, Math.round(value * scaleW));
    }

    private int scaleHeightDimension(int value) {
        if (value < 0) {
            return value;
        }
        if (value == 0) {
            return 0;
        }
        return Math.max(1, Math.round(value * scaleH));
    }

    private int scaleHorizontalSpacing(int value) {
        return Math.round(value * scaleW);
    }

    private int scaleVerticalSpacing(int value) {
        return Math.round(value * scaleH);
    }

    private void applyScaledTree(View view) {
        applyScaledViewState(view);

        if (view instanceof DesignScaleFrameLayout) {
            // Nested DesignScaleFrameLayout owns scaling for its descendants.
            return;
        }

        if (view instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) view;
            for (int i = 0; i < group.getChildCount(); i++) {
                applyScaledTree(group.getChildAt(i));
            }
        }
    }

    private void applyScaledViewState(View view) {
        OriginalViewState state = originalViewStates.get(view);
        if (state == null) {
            state = new OriginalViewState(view);
            originalViewStates.put(view, state);
        }
        state.apply(view, scaleW, scaleH);
    }

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        if (designRootWidthPx <= 0 || designRootHeightPx <= 0) {
            super.onMeasure(widthMeasureSpec, heightMeasureSpec);
            return;
        }

        if (hasDesignItemSize) {
            // Item size is relative to the device screen / designRoot, not parent MeasureSpec.
            // Uses root insets (not onApplyWindowInsets) so RV items shrink with system bars.
            contentOffsetY = 0;
            updateScales(dm.widthPixels, getAvailableScreenHeightPx());
        } else {
            int availableWidth = MeasureSpec.getSize(widthMeasureSpec);
            int measuredHeight = MeasureSpec.getSize(heightMeasureSpec);
            if (availableWidth <= 0) {
                availableWidth = dm.widthPixels;
            }
            if (measuredHeight <= 0) {
                measuredHeight = dm.heightPixels;
            }
            // Edge-to-edge: MeasureSpec may be the full window. Deduct only real
            // system-bar overlap so already-safe heights are not double-counted.
            int[] overlap = adjustRootOverlapForExtendEdges(getSystemBarOverlapPx(measuredHeight));
            contentOffsetY = overlap[0];
            int availableHeight = Math.max(1, measuredHeight - overlap[0] - overlap[1]);
            updateScales(availableWidth, availableHeight);
        }

        for (int i = 0; i < getChildCount(); i++) {
            applyScaledTree(getChildAt(i));
        }
        int childWidthSpec = MeasureSpec.makeMeasureSpec(contentWidthPx, MeasureSpec.EXACTLY);
        int childHeightSpec = MeasureSpec.makeMeasureSpec(contentHeightPx, MeasureSpec.EXACTLY);
        for (int i = 0; i < getChildCount(); i++) {
            View child = getChildAt(i);
            child.measure(childWidthSpec, childHeightSpec);
        }

        if (hasDesignItemSize) {
            setMeasuredDimension(contentWidthPx, contentHeightPx);
        } else {
            int availableWidth = MeasureSpec.getSize(widthMeasureSpec);
            int availableHeight = MeasureSpec.getSize(heightMeasureSpec);
            if (availableWidth <= 0) {
                availableWidth = dm.widthPixels;
            }
            if (availableHeight <= 0) {
                availableHeight = getAvailableScreenHeightPx();
            }
            setMeasuredDimension(availableWidth, availableHeight);
        }
    }

    @Override
    protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
        if (designRootWidthPx <= 0 || designRootHeightPx <= 0) {
            super.onLayout(changed, left, top, right, bottom);
            return;
        }

        if (hasDesignItemSize) {
            for (int i = 0; i < getChildCount(); i++) {
                View child = getChildAt(i);
                child.layout(0, 0, contentWidthPx, contentHeightPx);
            }
            return;
        }

        int[] overlap = adjustRootOverlapForExtendEdges(getSystemBarOverlapPx(getHeight()));
        contentOffsetY = overlap[0];
        int safeHeight = Math.max(1, getHeight() - overlap[0] - overlap[1]);
        int childLeft = contentOffsetX;
        // Keep content inside the safe area (below status / above nav); center only within it.
        int childTop = contentOffsetY + Math.max(0, (safeHeight - contentHeightPx) / 2);
        int childRight = childLeft + contentWidthPx;
        int childBottom = childTop + contentHeightPx;
        for (int i = 0; i < getChildCount(); i++) {
            View child = getChildAt(i);
            child.layout(childLeft, childTop, childRight, childBottom);
        }
        if (pendingOverlapRelayout) {
            pendingOverlapRelayout = false;
            post(this::requestLayout);
        }
    }

    /**
     * Shrinks {@code desiredTextSizePx} so the text stays inside the TextView box
     * (Compose AutoSizeText: step down from maxFontSize until it does not overflow).
     * Minimum is 1sp; do not clamp back up to designAutoSizeMinTextSize or text is clipped.
     */
    private float fitTextSizeToBounds(
            @NonNull TextView textView,
            @Nullable ViewGroup.LayoutParams params,
            float desiredTextSizePx
    ) {
        if (desiredTextSizePx <= 0f) {
            return desiredTextSizePx;
        }

        int availW = resolveAvailableWidthPx(textView, params);
        int availH = resolveAvailableHeightPx(textView, params);
        if (availW <= 0 && availH <= 0) {
            return desiredTextSizePx;
        }

        CharSequence measureText = resolveMeasureText(textView);
        if (measureText.length() == 0) {
            return desiredTextSizePx;
        }

        float minTextSizePx = Math.max(
                1f,
                TypedValue.applyDimension(
                        TypedValue.COMPLEX_UNIT_SP,
                        AUTO_SIZE_FIT_MIN_TEXT_SIZE_SP,
                        dm
                )
        );
        if (desiredTextSizePx <= minTextSizePx) {
            return Math.max(1f, desiredTextSizePx);
        }
        if (textFitsInBounds(textView, measureText, desiredTextSizePx, availW, availH)) {
            return desiredTextSizePx;
        }

        float low = minTextSizePx;
        float high = desiredTextSizePx;
        for (int i = 0; i < AUTO_SIZE_FIT_ITERATIONS; i++) {
            float mid = (low + high) / 2f;
            if (textFitsInBounds(textView, measureText, mid, availW, availH)) {
                low = mid;
            } else {
                high = mid;
            }
        }
        return Math.max(minTextSizePx, low);
    }

    @NonNull
    private static CharSequence resolveMeasureText(@NonNull TextView textView) {
        CharSequence text = textView.getText();
        if (text == null || text.length() == 0) {
            CharSequence hint = textView.getHint();
            if (hint != null && hint.length() > 0) {
                text = hint;
            }
        }
        if (text == null) {
            return "";
        }
        if (textView.getTransformationMethod() != null) {
            CharSequence transformed = textView.getTransformationMethod().getTransformation(text, textView);
            if (transformed != null) {
                text = transformed;
            }
        }
        return text;
    }

    private boolean textFitsInBounds(
            @NonNull TextView textView,
            @NonNull CharSequence text,
            float textSizePx,
            int availW,
            int availH
    ) {
        TextPaint paint = new TextPaint(textView.getPaint());
        paint.setTextSize(textSizePx);

        int maxLines = textView.getMaxLines();
        if (maxLines < 1) {
            maxLines = Integer.MAX_VALUE;
        }

        int layoutWidth = availW > 0
                ? Math.max(1, availW - AUTO_SIZE_WIDTH_SLACK_PX)
                : Integer.MAX_VALUE / 4;
        StaticLayout layout = StaticLayout.Builder.obtain(text, 0, text.length(), paint, layoutWidth)
                .setAlignment(Layout.Alignment.ALIGN_NORMAL)
                .setLineSpacing(textView.getLineSpacingExtra(), textView.getLineSpacingMultiplier())
                .setIncludePad(textView.getIncludeFontPadding())
                .setBreakStrategy(textView.getBreakStrategy())
                .setHyphenationFrequency(textView.getHyphenationFrequency())
                .build();

        if (availH > 0 && layout.getHeight() > availH) {
            return false;
        }
        if (layout.getLineCount() > maxLines) {
            return false;
        }
        if (availW > 0) {
            for (int i = 0; i < layout.getLineCount(); i++) {
                if (layout.getLineWidth(i) > layoutWidth) {
                    return false;
                }
            }
        }
        return true;
    }

    private int resolveAvailableWidthPx(
            @NonNull TextView textView,
            @Nullable ViewGroup.LayoutParams params
    ) {
        int width = params != null ? params.width : 0;
        if (width <= 0 && textView.isLaidOut() && textView.getWidth() > 0) {
            width = textView.getWidth();
        }
        if (width <= 0) {
            width = resolveNearestFixedSizePx(textView.getParent(), true);
        }
        if (width <= 0) {
            return 0;
        }
        return Math.max(0, width - textView.getPaddingLeft() - textView.getPaddingRight());
    }

    private int resolveAvailableHeightPx(
            @NonNull TextView textView,
            @Nullable ViewGroup.LayoutParams params
    ) {
        int height = params != null ? params.height : 0;
        if (height <= 0 && textView.isLaidOut() && textView.getHeight() > 0) {
            height = textView.getHeight();
        }
        if (height <= 0) {
            height = resolveNearestFixedSizePx(textView.getParent(), false);
        }
        if (height <= 0) {
            return 0;
        }
        return Math.max(0, height - textView.getPaddingTop() - textView.getPaddingBottom());
    }

    private int resolveNearestFixedSizePx(@Nullable ViewParent parent, boolean horizontal) {
        while (parent instanceof View) {
            View view = (View) parent;
            ViewGroup.LayoutParams params = view.getLayoutParams();
            if (params != null) {
                int size = horizontal ? params.width : params.height;
                if (size > 0) {
                    return horizontal
                            ? Math.max(0, size - view.getPaddingLeft() - view.getPaddingRight())
                            : Math.max(0, size - view.getPaddingTop() - view.getPaddingBottom());
                }
            }
            if (view instanceof DesignScaleFrameLayout) {
                break;
            }
            parent = view.getParent();
        }
        return 0;
    }

    private final class OriginalViewState {
        private final int paddingLeft;
        private final int paddingTop;
        private final int paddingRight;
        private final int paddingBottom;
        private final int minimumWidth;
        private final int minimumHeight;
        private final float textSizePx;
        private final OriginalLayoutParamsState layoutParamsState;

        OriginalViewState(View view) {
            paddingLeft = view.getPaddingLeft();
            paddingTop = view.getPaddingTop();
            paddingRight = view.getPaddingRight();
            paddingBottom = view.getPaddingBottom();
            minimumWidth = view.getMinimumWidth();
            minimumHeight = view.getMinimumHeight();
            textSizePx = view instanceof TextView ? ((TextView) view).getTextSize() : -1f;
            layoutParamsState = new OriginalLayoutParamsState(view.getLayoutParams());
        }

        void apply(View view, float scaleX, float scaleY) {
            ViewGroup.LayoutParams params = view.getLayoutParams();
            if (params != null) {
                layoutParamsState.apply(params);
                view.setLayoutParams(params);
            }

            view.setPadding(
                    Math.round(paddingLeft * scaleX),
                    Math.round(paddingTop * scaleY),
                    Math.round(paddingRight * scaleX),
                    Math.round(paddingBottom * scaleY)
            );
            view.setMinimumWidth(scaleWidthDimension(minimumWidth));
            view.setMinimumHeight(scaleHeightDimension(minimumHeight));

            if (view instanceof TextView && textSizePx >= 0f) {
                TextView textView = (TextView) view;
                float textScale = Math.min(scaleX, scaleY);
                float baseTextSizePx = textSizePx * textScale;
                float fontScale = getResources().getConfiguration().fontScale;
                float clampedFontScale = Math.max(
                        autoSizeMinTextSize,
                        Math.min(autoSizeMaxTextSize, fontScale)
                );
                float desiredTextSizePx = baseTextSizePx * clampedFontScale;
                float maxTextSizePx = baseTextSizePx * autoSizeMaxTextSize;
                desiredTextSizePx = Math.min(maxTextSizePx, desiredTextSizePx);
                float fittedTextSizePx = fitTextSizeToBounds(textView, params, desiredTextSizePx);
                textView.setTextSize(TypedValue.COMPLEX_UNIT_PX, fittedTextSizePx);
            }
        }
    }

    private final class OriginalLayoutParamsState {
        private final int width;
        private final int height;
        private final boolean hasMargins;
        private final int leftMargin;
        private final int topMargin;
        private final int rightMargin;
        private final int bottomMargin;
        private final boolean isConstraintLayoutParams;
        private final int goneLeftMargin;
        private final int goneTopMargin;
        private final int goneRightMargin;
        private final int goneBottomMargin;
        private final int goneStartMargin;
        private final int goneEndMargin;
        private final int matchConstraintMinWidth;
        private final int matchConstraintMinHeight;
        private final int matchConstraintMaxWidth;
        private final int matchConstraintMaxHeight;
        private final int guideBegin;
        private final int guideEnd;
        private final int circleRadius;

        OriginalLayoutParamsState(@Nullable ViewGroup.LayoutParams params) {
            width = params != null ? params.width : ViewGroup.LayoutParams.WRAP_CONTENT;
            height = params != null ? params.height : ViewGroup.LayoutParams.WRAP_CONTENT;

            hasMargins = params instanceof ViewGroup.MarginLayoutParams;
            if (hasMargins) {
                ViewGroup.MarginLayoutParams marginParams = (ViewGroup.MarginLayoutParams) params;
                leftMargin = marginParams.leftMargin;
                topMargin = marginParams.topMargin;
                rightMargin = marginParams.rightMargin;
                bottomMargin = marginParams.bottomMargin;
            } else {
                leftMargin = 0;
                topMargin = 0;
                rightMargin = 0;
                bottomMargin = 0;
            }

            isConstraintLayoutParams = params instanceof ConstraintLayout.LayoutParams;
            if (isConstraintLayoutParams) {
                ConstraintLayout.LayoutParams constraintParams = (ConstraintLayout.LayoutParams) params;
                goneLeftMargin = constraintParams.goneLeftMargin;
                goneTopMargin = constraintParams.goneTopMargin;
                goneRightMargin = constraintParams.goneRightMargin;
                goneBottomMargin = constraintParams.goneBottomMargin;
                goneStartMargin = constraintParams.goneStartMargin;
                goneEndMargin = constraintParams.goneEndMargin;
                matchConstraintMinWidth = constraintParams.matchConstraintMinWidth;
                matchConstraintMinHeight = constraintParams.matchConstraintMinHeight;
                matchConstraintMaxWidth = constraintParams.matchConstraintMaxWidth;
                matchConstraintMaxHeight = constraintParams.matchConstraintMaxHeight;
                guideBegin = constraintParams.guideBegin;
                guideEnd = constraintParams.guideEnd;
                circleRadius = constraintParams.circleConstraint != ConstraintLayout.LayoutParams.UNSET
                        ? constraintParams.circleRadius
                        : 0;
            } else {
                goneLeftMargin = ConstraintLayout.LayoutParams.UNSET;
                goneTopMargin = ConstraintLayout.LayoutParams.UNSET;
                goneRightMargin = ConstraintLayout.LayoutParams.UNSET;
                goneBottomMargin = ConstraintLayout.LayoutParams.UNSET;
                goneStartMargin = ConstraintLayout.LayoutParams.UNSET;
                goneEndMargin = ConstraintLayout.LayoutParams.UNSET;
                matchConstraintMinWidth = 0;
                matchConstraintMinHeight = 0;
                matchConstraintMaxWidth = 0;
                matchConstraintMaxHeight = 0;
                guideBegin = ConstraintLayout.LayoutParams.UNSET;
                guideEnd = ConstraintLayout.LayoutParams.UNSET;
                circleRadius = 0;
            }
        }

        void apply(ViewGroup.LayoutParams params) {
            params.width = scaleWidthDimension(width);
            params.height = scaleHeightDimension(height);

            if (hasMargins && params instanceof ViewGroup.MarginLayoutParams) {
                ViewGroup.MarginLayoutParams marginParams = (ViewGroup.MarginLayoutParams) params;
                marginParams.leftMargin = scaleHorizontalSpacing(leftMargin);
                marginParams.topMargin = scaleVerticalSpacing(topMargin);
                marginParams.rightMargin = scaleHorizontalSpacing(rightMargin);
                marginParams.bottomMargin = scaleVerticalSpacing(bottomMargin);
            }

            if (isConstraintLayoutParams && params instanceof ConstraintLayout.LayoutParams) {
                ConstraintLayout.LayoutParams constraintParams = (ConstraintLayout.LayoutParams) params;
                constraintParams.goneLeftMargin = scaleUnsetAwareHorizontal(goneLeftMargin);
                constraintParams.goneTopMargin = scaleUnsetAwareVertical(goneTopMargin);
                constraintParams.goneRightMargin = scaleUnsetAwareHorizontal(goneRightMargin);
                constraintParams.goneBottomMargin = scaleUnsetAwareVertical(goneBottomMargin);
                constraintParams.goneStartMargin = scaleUnsetAwareHorizontal(goneStartMargin);
                constraintParams.goneEndMargin = scaleUnsetAwareHorizontal(goneEndMargin);
                constraintParams.matchConstraintMinWidth = scaleWidthDimension(matchConstraintMinWidth);
                constraintParams.matchConstraintMinHeight = scaleHeightDimension(matchConstraintMinHeight);
                constraintParams.matchConstraintMaxWidth = scaleWidthDimension(matchConstraintMaxWidth);
                constraintParams.matchConstraintMaxHeight = scaleHeightDimension(matchConstraintMaxHeight);
                constraintParams.guideBegin = scaleUnsetAwareHorizontal(guideBegin);
                constraintParams.guideEnd = scaleUnsetAwareHorizontal(guideEnd);
                if (constraintParams.circleConstraint != ConstraintLayout.LayoutParams.UNSET) {
                    constraintParams.circleRadius = scaleWidthDimension(circleRadius);
                }
            }
        }

        private int scaleUnsetAwareHorizontal(int value) {
            if (value == ConstraintLayout.LayoutParams.UNSET) {
                return value;
            }
            return scaleHorizontalSpacing(value);
        }

        private int scaleUnsetAwareVertical(int value) {
            if (value == ConstraintLayout.LayoutParams.UNSET) {
                return value;
            }
            return scaleVerticalSpacing(value);
        }
    }
}
