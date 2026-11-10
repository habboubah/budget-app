package com.habboubah.spartopf;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The app's own plugin (src/native/bridge.ts), before the bridge starts.
        registerPlugin(SpartopfSharedPlugin.class);
        super.onCreate(savedInstanceState);
        // No screenshots and a blank card in Recents while the app lock is on (plan 23):
        // set before the first frame, from what the app last chose.
        SpartopfSharedPlugin.applySecure(this, getWindow());
    }
}
