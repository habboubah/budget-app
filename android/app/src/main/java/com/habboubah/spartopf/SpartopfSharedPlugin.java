package com.habboubah.spartopf;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.telephony.TelephonyManager;
import android.view.Window;
import android.view.WindowManager;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * Android's side of src/native/bridge.ts (plan 23) — the counterpart of
 * SpartopfShared.swift, as far as Android has the same things:
 *
 * - open: a link outside the app — Google Play, the browser or the mail app.
 *   Only https links to the hosts below and mailto: links.
 * - system: "Android 15" for the feedback mail.
 * - region: the country the phone is at home in ("DE"), for the currency a
 *   new book starts in — the SIM's, else the network's, else the language's.
 * - makePdf: the page as printed (only the report, index.css .print-root)
 *   through Android's print dialog, which saves a PDF or prints.
 * - setSecure: FLAG_SECURE on the window while the app lock is on — no
 *   screenshots, a blank card in Recents. Kept in the app's preferences, so
 *   MainActivity sets it again before the first frame of a cold start.
 *
 * The snapshot, the inbox and Siri's amounts belong to the iPhone's App Group
 * (plans 14, 18, 19); here they do nothing and report nothing, until plan 24
 * gives Android its own.
 */
@CapacitorPlugin(name = "SpartopfShared")
public class SpartopfSharedPlugin extends Plugin {

    static final String PREFS = "spartopf";
    static final String SECURE = "secure";

    /** Hosts `open` may hand to Android (Optionen › Über Spartopf, src/links.ts). */
    private static final Set<String> OPEN_HOSTS = new HashSet<>(Arrays.asList("play.google.com", "habboubah.github.io"));

    /** FLAG_SECURE as last chosen — called by MainActivity before the web view shows anything. */
    static void applySecure(Context context, Window window) {
        boolean on = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(SECURE, false);
        if (on) window.addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        else window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
    }

    @PluginMethod
    public void setSecure(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(SECURE, on).apply();
        getActivity().runOnUiThread(() -> {
            applySecure(getContext(), getActivity().getWindow());
            call.resolve();
        });
    }

    @PluginMethod
    public void open(PluginCall call) {
        String text = call.getString("url");
        Uri uri = text == null ? null : Uri.parse(text);
        String scheme = uri == null || uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
        String host = uri == null || uri.getHost() == null ? "" : uri.getHost().toLowerCase();
        if (!(scheme.equals("mailto") || (scheme.equals("https") && OPEN_HOSTS.contains(host)))) {
            call.reject("This link isn't opened");
            return;
        }
        try {
            Intent intent = new Intent(scheme.equals("mailto") ? Intent.ACTION_SENDTO : Intent.ACTION_VIEW, uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Nothing opened the link");
        }
    }

    @PluginMethod
    public void system(PluginCall call) {
        JSObject result = new JSObject();
        result.put("name", "Android");
        result.put("version", Build.VERSION.RELEASE);
        call.resolve(result);
    }

    @PluginMethod
    public void region(PluginCall call) {
        JSObject result = new JSObject();
        result.put("region", phoneRegion(getContext()));
        call.resolve(result);
    }

    /**
     * Where the phone is at home: its SIM's country, else the network's (no permission
     * needed for either). Only without both — a Wi-Fi-only tablet — the language's
     * region, since Android has no region setting of its own. Empty when none.
     */
    static String phoneRegion(Context context) {
        try {
            TelephonyManager phone = (TelephonyManager) context.getSystemService(Context.TELEPHONY_SERVICE);
            if (phone != null) {
                String sim = phone.getSimCountryIso();
                if (sim != null && sim.length() == 2) return sim.toUpperCase(Locale.ROOT);
                String network = phone.getNetworkCountryIso();
                if (network != null && network.length() == 2) return network.toUpperCase(Locale.ROOT);
            }
        } catch (RuntimeException ignored) {
            // No telephony on this device: the language's region below.
        }
        String country = Locale.getDefault().getCountry();
        return country != null && country.length() == 2 ? country.toUpperCase(Locale.ROOT) : "";
    }

    @PluginMethod
    public void makePdf(PluginCall call) {
        String asked = call.getString("name", "Spartopf");
        String name = (asked == null ? "Spartopf" : asked).replaceAll("[/\\\\:*?\"<>|]", "-");
        getActivity().runOnUiThread(() -> {
            try {
                PrintManager manager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                manager.print(name, getBridge().getWebView().createPrintDocumentAdapter(name), new PrintAttributes.Builder().build());
                call.resolve();
            } catch (Exception e) {
                call.reject("The report couldn't be printed");
            }
        });
    }

    // The iPhone's App Group (plans 14, 18, 19): nothing of it on Android yet.

    @PluginMethod
    public void writeSnapshot(PluginCall call) { call.resolve(); }

    @PluginMethod
    public void readSnapshot(PluginCall call) {
        JSObject result = new JSObject();
        result.put("json", JSObject.NULL);
        call.resolve(result);
    }

    @PluginMethod
    public void readInbox(PluginCall call) {
        JSObject result = new JSObject();
        result.put("items", new JSArray());
        call.resolve(result);
    }

    @PluginMethod
    public void removeInbox(PluginCall call) { call.resolve(); }

    @PluginMethod
    public void clear(PluginCall call) { call.resolve(); }

    @PluginMethod
    public void writeAmounts(PluginCall call) { call.resolve(); }

    @PluginMethod
    public void removeAmounts(PluginCall call) { call.resolve(); }

    /** Google's in-app review needs Play Services' library; the app has none. *Spartopf bewerten* opens the Play page instead. */
    @PluginMethod
    public void requestReview(PluginCall call) { call.resolve(); }
}
