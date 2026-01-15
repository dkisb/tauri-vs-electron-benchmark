#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::OnceLock;
use std::time::Instant;
use tauri::Manager;

static LAUNCH_TIME: OnceLock<Instant> = OnceLock::new();

fn main() {
    LAUNCH_TIME.get_or_init(Instant::now);
    
    let is_bench = std::env::args().any(|a| a == "--bench");

    tauri::Builder::default()
        .setup(move |app| {
            let window = app.get_webview_window("main").unwrap();
            
            // Measure when window is ready to show
            let elapsed_ms = LAUNCH_TIME.get().unwrap().elapsed().as_secs_f64() * 1000.0;
            eprintln!("BENCH_STARTUP_MS:{:.2}", elapsed_ms);
            
            window.show().unwrap();
            
            if is_bench {
                std::thread::spawn(|| {
                    std::thread::sleep(std::time::Duration::from_millis(200));
                    std::process::exit(0);
                });
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
