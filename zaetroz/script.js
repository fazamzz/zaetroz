// =====================================================
// Zaetroz Thinks - script.js
// Semua kode dibungkus satu fungsi supaya nama variabelnya
// tidak bentrok dengan bawaan browser.
// =====================================================
(function () {
    'use strict';

    // Nomor WhatsApp tujuan form kontak (format internasional, tanpa +)
    var NOMOR_WA = '6283114558334';

    // Preferensi pengguna: kurangi gerakan, dan apakah perangkat punya kursor
    var kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var adaKursor = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // ---------- alat bantu kecil ----------
    function qs(selector, root) {
        return (root || document).querySelector(selector);
    }

    function qsa(selector, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(selector));
    }

    // Simpan dan baca data kecil di browser pembaca (aman kalau penyimpanan diblokir)
    function baca(kunci) {
        try {
            var data = JSON.parse(localStorage.getItem(kunci));
            return Array.isArray(data) ? data : [];
        } catch (e) {
            return [];
        }
    }

    function simpan(kunci, nilai) {
        try {
            localStorage.setItem(kunci, JSON.stringify(nilai));
        } catch (e) {
            // diabaikan: fitur tetap jalan, hanya tidak diingat
        }
    }

    // -----------------------------------------------------
    // 1. Menu HP: buka / tutup
    // -----------------------------------------------------
    var navbar = qs('#navbar');
    var tombolMenu = qs('#navToggle');

    function tutupMenu() {
        navbar.classList.remove('open');
        tombolMenu.setAttribute('aria-expanded', 'false');
    }

    tombolMenu.addEventListener('click', function () {
        var terbuka = navbar.classList.toggle('open');
        tombolMenu.setAttribute('aria-expanded', terbuka);
    });

    qsa('#navLinks a').forEach(function (link) {
        link.addEventListener('click', tutupMenu);
    });

    // -----------------------------------------------------
    // 2. Efek saat scroll: bayangan navbar, progres baca, tombol ke atas
    // -----------------------------------------------------
    var garisProgres = qs('#progress');
    var tombolAtas = qs('#toTop');
    var sedangMenunggu = false;

    function saatScroll() {
        var posisi = window.scrollY;
        var tinggi = document.documentElement.scrollHeight - window.innerHeight;

        navbar.classList.toggle('scrolled', posisi > 40);
        garisProgres.style.transform = 'scaleX(' + (tinggi > 0 ? posisi / tinggi : 0) + ')';
        tombolAtas.classList.toggle('show', posisi > 600);
    }

    window.addEventListener('scroll', function () {
        if (sedangMenunggu) return;
        sedangMenunggu = true;
        requestAnimationFrame(function () {
            saatScroll();
            sedangMenunggu = false;
        });
    }, { passive: true });
    saatScroll();

    tombolAtas.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: kurangiGerak ? 'auto' : 'smooth' });
    });

    // -----------------------------------------------------
    // 3. Tandai menu yang sedang aktif
    // -----------------------------------------------------
    var linkMenu = qsa('#navLinks a');

    if ('IntersectionObserver' in window) {
        var pengamatMenu = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    linkMenu.forEach(function (link) {
                        link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
                    });
                }
            });
        }, { rootMargin: '-45% 0px -50% 0px' });

        qsa('main section').forEach(function (s) {
            pengamatMenu.observe(s);
        });
    }

    // -----------------------------------------------------
    // 4. Animasi muncul saat elemen terlihat
    // -----------------------------------------------------
    var elemenMuncul = qsa('[data-reveal]');

    if ('IntersectionObserver' in window && !kurangiGerak) {
        var pengamatMuncul = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var el = entry.target;
                el.classList.add('in');
                pengamatMuncul.unobserve(el);
                // hapus jeda setelah selesai supaya efek hover tidak ikut tertunda
                setTimeout(function () { el.style.transitionDelay = ''; }, 1200);
            });
        }, { threshold: 0.12 });

        elemenMuncul.forEach(function (el) {
            // jeda bertahap berdasarkan urutan di antara saudaranya
            var urutan = Array.prototype.indexOf.call(el.parentNode.children, el);
            el.style.transitionDelay = (urutan % 4) * 90 + 'ms';
            pengamatMuncul.observe(el);
        });
    } else {
        elemenMuncul.forEach(function (el) { el.classList.add('in'); });
    }

    // -----------------------------------------------------
    // 5. Cover: slideshow lukisan, kursor bercahaya, kutipan berganti
    // -----------------------------------------------------
    var cover = qs('.cover');
    var kotakSlide = qs('#coverSlides');
    var slide = qsa('.slide', kotakSlide);
    var kotakTitik = qs('#coverDots');
    var slideAktif = 0;
    var pewaktuSlide = null;

    function tampilkanSlide(nomor) {
        slideAktif = (nomor + slide.length) % slide.length;
        slide.forEach(function (s, i) { s.classList.toggle('active', i === slideAktif); });
        qsa('button', kotakTitik).forEach(function (t, i) { t.classList.toggle('active', i === slideAktif); });
    }

    function mulaiSlideshow() {
        if (kurangiGerak || slide.length < 2 || pewaktuSlide) return;
        pewaktuSlide = setInterval(function () { tampilkanSlide(slideAktif + 1); }, 6500);
    }

    function hentikanSlideshow() {
        clearInterval(pewaktuSlide);
        pewaktuSlide = null;
    }

    slide.forEach(function (s, i) {
        var titik = document.createElement('button');
        titik.type = 'button';
        titik.setAttribute('aria-label', 'Tampilkan gambar ' + (i + 1));
        titik.addEventListener('click', function () {
            tampilkanSlide(i);
            hentikanSlideshow();
            mulaiSlideshow();
        });
        kotakTitik.appendChild(titik);
    });
    tampilkanSlide(0);
    mulaiSlideshow();

    // jangan memutar slideshow saat tab sedang tidak dilihat
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) hentikanSlideshow(); else mulaiSlideshow();
    });

    // cahaya mengikuti kursor + gambar bergeser tipis (hanya di perangkat dengan kursor)
    if (cover && adaKursor && !kurangiGerak) {
        var kursorX = 0;
        var kursorY = 0;
        var menungguFrame = false;

        function perbaruiCover() {
            var lebar = cover.clientWidth || 1;
            var tinggi = cover.clientHeight || 1;
            cover.style.setProperty('--mx', kursorX + 'px');
            cover.style.setProperty('--my', kursorY + 'px');
            kotakSlide.style.setProperty('--px', ((kursorX / lebar - 0.5) * -24) + 'px');
            kotakSlide.style.setProperty('--py', ((kursorY / tinggi - 0.5) * -24) + 'px');
            menungguFrame = false;
        }

        cover.addEventListener('pointermove', function (e) {
            var kotak = cover.getBoundingClientRect();
            kursorX = e.clientX - kotak.left;
            kursorY = e.clientY - kotak.top;
            if (!menungguFrame) {
                menungguFrame = true;
                requestAnimationFrame(perbaruiCover);
            }
        });

        cover.addEventListener('pointerleave', function () {
            kursorX = cover.clientWidth / 2;
            kursorY = cover.clientHeight * 0.46;
            requestAnimationFrame(perbaruiCover);
        });
    }

    // kutipan di cover diambil dari Fragments, jadi selalu sinkron dengan isinya
    var kutipanCover = qs('#coverQuote');
    var daftarKutipan = qsa('.fragment blockquote').map(function (b) { return b.textContent.trim(); });
    var nomorKutipan = daftarKutipan.length ? Math.floor(Math.random() * daftarKutipan.length) : 0;

    function isiKutipan() {
        kutipanCover.textContent = '“' + daftarKutipan[nomorKutipan] + '”';
    }

    if (kutipanCover && daftarKutipan.length) {
        isiKutipan();

        if (!kurangiGerak) {
            var kursorDiAtasKutipan = false;
            kutipanCover.addEventListener('mouseenter', function () { kursorDiAtasKutipan = true; });
            kutipanCover.addEventListener('mouseleave', function () { kursorDiAtasKutipan = false; });

            setInterval(function () {
                if (kursorDiAtasKutipan || document.hidden) return;
                kutipanCover.classList.add('swap');
                setTimeout(function () {
                    nomorKutipan = (nomorKutipan + 1) % daftarKutipan.length;
                    isiKutipan();
                    kutipanCover.classList.remove('swap');
                }, 500);
            }, 7500);
        }
    }

    // -----------------------------------------------------
    // 6. Angka statistik dihitung dari isi halaman lalu dianimasikan
    // -----------------------------------------------------
    var jumlah = {
        posts: qsa('#postContainer .post-card').length,
        eps: qsa('.series-parts li').length,
        frags: qsa('.fragment').length
    };

    function hitungNaik(el, target) {
        if (kurangiGerak) {
            el.textContent = target;
            return;
        }
        var mulai = null;
        var durasi = 1300;

        function langkah(waktu) {
            if (mulai === null) mulai = waktu;
            var p = Math.min((waktu - mulai) / durasi, 1);
            var halus = 1 - Math.pow(1 - p, 3); // melambat di akhir
            el.textContent = Math.round(target * halus);
            if (p < 1) requestAnimationFrame(langkah);
        }
        requestAnimationFrame(langkah);
    }

    qsa('[data-count]').forEach(function (el) {
        var target = jumlah[el.getAttribute('data-count')];
        if (typeof target !== 'number') return;

        if ('IntersectionObserver' in window) {
            el.textContent = '0';
            var pengamatAngka = new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting) {
                    hitungNaik(el, target);
                    pengamatAngka.disconnect();
                }
            }, { threshold: 0.6 });
            pengamatAngka.observe(el);
        } else {
            el.textContent = target;
        }
    });

    // -----------------------------------------------------
    // 7. Tulisan: cari, filter, urutkan, simpan, efek miring
    // -----------------------------------------------------
    var kisi = qs('#postContainer');
    var kartu = qsa('.post-card', kisi);
    var kolomCari = qs('#cari');
    var tombolFilter = qsa('.filter .chip');
    var tombolUrut = qs('#sortBtn');
    var infoHasil = qs('#resultCount');
    var catatanKosong = qs('#emptyNote');
    var teksKosong = qs('#emptyText');
    var angkaTersimpan = qs('#savedCount');
    var tersimpan = baca('zt:tersimpan');
    var kondisi = { cari: '', kategori: 'semua', urut: 'baru' };

    // teks yang dicari: judul + ringkasan + kategori (bukan tombol-tombolnya)
    kartu.forEach(function (k) {
        var judul = qs('h3', k).textContent;
        var ringkasan = qs('.post-body > p', k).textContent;
        var kategori = qs('.post-tag', k).textContent;
        k.setAttribute('data-cari', (judul + ' ' + ringkasan + ' ' + kategori).toLowerCase());
    });

    function bandingkan(a, b) {
        // terbaru dulu; kalau tanggalnya sama, ikuti urutan asli
        return b.getAttribute('data-tanggal').localeCompare(a.getAttribute('data-tanggal')) ||
            Number(a.getAttribute('data-order')) - Number(b.getAttribute('data-order'));
    }

    function tampilkanTulisan() {
        var kataCari = kondisi.cari.trim().toLowerCase();
        var urutan = kartu.slice().sort(function (a, b) {
            return kondisi.urut === 'baru' ? bandingkan(a, b) : -bandingkan(a, b);
        });
        var terlihat = 0;

        urutan.forEach(function (k) {
            var cocokCari = !kataCari || k.getAttribute('data-cari').indexOf(kataCari) !== -1;
            var cocokKategori;

            if (kondisi.kategori === 'semua') {
                cocokKategori = true;
            } else if (kondisi.kategori === 'tersimpan') {
                cocokKategori = tersimpan.indexOf(k.getAttribute('data-id')) !== -1;
            } else {
                cocokKategori = k.getAttribute('data-kategori') === kondisi.kategori;
            }

            var tampil = cocokCari && cocokKategori;
            k.hidden = !tampil;
            k.classList.remove('featured');
            kisi.appendChild(k); // susun ulang sesuai urutan
            if (tampil) {
                terlihat++;
                k.classList.add('in');
                // kartu pertama jadi "unggulan" hanya saat tampilan bawaan
                if (terlihat === 1 && !kataCari && kondisi.kategori === 'semua' && kondisi.urut === 'baru') {
                    k.classList.add('featured');
                }
            }
        });

        // teks info jumlah hasil
        if (!kataCari && kondisi.kategori === 'semua') {
            infoHasil.textContent = kartu.length + ' tulisan';
        } else {
            infoHasil.textContent = 'Menampilkan ' + terlihat + ' dari ' + kartu.length + ' tulisan' +
                (kataCari ? ' untuk “' + kondisi.cari.trim() + '”' : '');
        }

        // pesan kalau tidak ada hasil
        catatanKosong.hidden = terlihat > 0;
        if (terlihat === 0) {
            teksKosong.textContent = (kondisi.kategori === 'tersimpan' && !kataCari)
                ? 'Belum ada tulisan yang disimpan. Tekan ikon penanda di pojok kartu untuk menyimpannya.'
                : 'Tidak ada tulisan yang cocok dengan pencarianmu.';
        }

        tombolFilter.forEach(function (t) {
            var aktif = t.getAttribute('data-filter') === kondisi.kategori;
            t.classList.toggle('active', aktif);
            t.setAttribute('aria-pressed', aktif);
        });
        tombolUrut.textContent = kondisi.urut === 'baru' ? 'Terbaru ↓' : 'Terlama ↑';
        angkaTersimpan.textContent = tersimpan.length;
    }

    kolomCari.addEventListener('input', function () {
        kondisi.cari = kolomCari.value;
        tampilkanTulisan();
    });

    kolomCari.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            kolomCari.value = '';
            kondisi.cari = '';
            tampilkanTulisan();
            kolomCari.blur();
        }
    });

    tombolFilter.forEach(function (tombol) {
        tombol.addEventListener('click', function () {
            kondisi.kategori = tombol.getAttribute('data-filter');
            tampilkanTulisan();
        });
    });

    tombolUrut.addEventListener('click', function () {
        kondisi.urut = kondisi.urut === 'baru' ? 'lama' : 'baru';
        tampilkanTulisan();
    });

    qs('#resetFilter').addEventListener('click', function () {
        kondisi.cari = '';
        kondisi.kategori = 'semua';
        kolomCari.value = '';
        tampilkanTulisan();
    });

    // tombol simpan di tiap kartu
    kartu.forEach(function (k) {
        var id = k.getAttribute('data-id');
        var tombol = qs('.bookmark', k);

        tombol.setAttribute('aria-pressed', tersimpan.indexOf(id) !== -1);

        tombol.addEventListener('click', function () {
            var posisi = tersimpan.indexOf(id);
            if (posisi === -1) tersimpan.push(id); else tersimpan.splice(posisi, 1);
            simpan('zt:tersimpan', tersimpan);
            tombol.setAttribute('aria-pressed', posisi === -1);
            tombol.setAttribute('aria-label', posisi === -1 ? 'Hapus dari simpanan' : 'Simpan tulisan ini');
            // kalau sedang melihat daftar simpanan, kartu yang dilepas langsung hilang
            tampilkanTulisan();
        });

        // kartu miring tipis mengikuti kursor (bukan di layar sentuh, bukan kartu unggulan)
        if (adaKursor && !kurangiGerak) {
            k.addEventListener('pointermove', function (e) {
                if (e.pointerType !== 'mouse' || k.classList.contains('featured')) return;
                var kotak = k.getBoundingClientRect();
                var x = (e.clientX - kotak.left) / kotak.width - 0.5;
                var y = (e.clientY - kotak.top) / kotak.height - 0.5;
                k.style.transform = 'perspective(900px) rotateX(' + (-y * 5) + 'deg) rotateY(' + (x * 6) + 'deg) translateY(-4px)';
            });
            k.addEventListener('pointerleave', function () {
                k.style.transform = '';
            });
        }
    });

    // tekan "/" di mana saja untuk langsung mengetik pencarian
    document.addEventListener('keydown', function (e) {
        var sedangMengetik = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
        if (e.key === '/' && !sedangMengetik && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            kolomCari.focus();
        }
        if (e.key === 'Escape') tutupMenu();
    });

    // pengaturan awal: hitung ulang tampilan dan pasang label tombol simpan
    kartu.forEach(function (k) {
        var tombol = qs('.bookmark', k);
        if (tersimpan.indexOf(k.getAttribute('data-id')) !== -1) {
            tombol.setAttribute('aria-label', 'Hapus dari simpanan');
        }
    });
    tampilkanTulisan();

    // -----------------------------------------------------
    // 8. Series: tandai episode yang sudah dibuka
    // -----------------------------------------------------
    var linkEpisode = qsa('.series-parts a');
    var kotakProgres = qs('#seriesProgress');
    var batangProgres = qs('#seriesBar');
    var teksProgres = qs('#seriesText');
    var tombolLanjut = qs('#seriesNext');
    var tombolResetSeries = qs('#seriesReset');
    var sudahDibaca = baca('zt:episode');

    function perbaruiSeries() {
        var total = linkEpisode.length;
        var belum = null;

        linkEpisode.forEach(function (a, i) {
            var terbaca = sudahDibaca.indexOf('ep' + (i + 1)) !== -1;
            a.classList.toggle('read', terbaca);
            if (!terbaca && belum === null) belum = i;
        });

        batangProgres.style.width = (sudahDibaca.length / total * 100) + '%';
        teksProgres.textContent = sudahDibaca.length + ' dari ' + total + ' episode dibaca';

        if (belum === null) {
            tombolLanjut.textContent = 'Baca ulang dari Episode 1';
            tombolLanjut.href = linkEpisode[0].href;
        } else {
            tombolLanjut.textContent = (sudahDibaca.length ? 'Lanjut: Episode ' : 'Mulai dari Episode ') + (belum + 1);
            tombolLanjut.href = linkEpisode[belum].href;
        }
    }

    function tandaiEpisode(nomor) {
        var id = 'ep' + (nomor + 1);
        if (sudahDibaca.indexOf(id) === -1) {
            sudahDibaca.push(id);
            simpan('zt:episode', sudahDibaca);
            perbaruiSeries();
        }
    }

    linkEpisode.forEach(function (a, i) {
        a.addEventListener('click', function () { tandaiEpisode(i); });
        a.addEventListener('auxclick', function () { tandaiEpisode(i); }); // klik tengah
    });

    // tombol "lanjut" juga menandai episode yang akan dibuka
    tombolLanjut.addEventListener('click', function () {
        var nomor = linkEpisode.map(function (a) { return a.href; }).indexOf(tombolLanjut.href);
        if (nomor !== -1) tandaiEpisode(nomor);
    });

    tombolResetSeries.addEventListener('click', function () {
        sudahDibaca = [];
        simpan('zt:episode', sudahDibaca);
        perbaruiSeries();
    });

    kotakProgres.hidden = false;
    perbaruiSeries();

    // -----------------------------------------------------
    // 9. Fragments: buka renungan, buka semua, fragment acak
    // -----------------------------------------------------
    var fragmen = qsa('.fragment');
    var tombolSemua = qs('#fragToggleAll');
    var fragmenTerakhir = -1;

    function aturBuka(f, buka) {
        var tombol = qs('.frag-toggle', f);
        f.classList.toggle('open', buka);
        tombol.setAttribute('aria-expanded', buka);
        tombol.textContent = buka ? 'Tutup renungan' : 'Baca renungannya';
        perbaruiTombolSemua();
    }

    function perbaruiTombolSemua() {
        var semuaTerbuka = fragmen.every(function (f) { return f.classList.contains('open'); });
        tombolSemua.textContent = semuaTerbuka ? 'Tutup semua' : 'Buka semua';
    }

    fragmen.forEach(function (f) {
        function balik() { aturBuka(f, !f.classList.contains('open')); }
        qs('.frag-toggle', f).addEventListener('click', balik);
        qs('blockquote', f).addEventListener('click', balik);
    });

    tombolSemua.addEventListener('click', function () {
        var semuaTerbuka = fragmen.every(function (f) { return f.classList.contains('open'); });
        fragmen.forEach(function (f) { aturBuka(f, !semuaTerbuka); });
    });

    function fragmenAcak() {
        var nomor;
        do {
            nomor = Math.floor(Math.random() * fragmen.length);
        } while (fragmen.length > 1 && nomor === fragmenTerakhir);
        fragmenTerakhir = nomor;

        var f = fragmen[nomor];
        f.classList.add('in');
        f.scrollIntoView({ behavior: kurangiGerak ? 'auto' : 'smooth', block: 'center' });

        setTimeout(function () {
            aturBuka(f, true);
            f.classList.remove('spot');
            void f.offsetWidth; // mulai ulang animasi kedip
            f.classList.add('spot');
            setTimeout(function () { f.classList.remove('spot'); }, 2100);
        }, kurangiGerak ? 0 : 500);
    }

    qsa('.js-random-fragment').forEach(function (t) {
        t.addEventListener('click', fragmenAcak);
    });

    // -----------------------------------------------------
    // 10. Form kontak: validasi lalu kirim lewat WhatsApp
    // -----------------------------------------------------
    var form = qs('#contactForm');
    var inputNama = qs('#name');
    var inputEmail = qs('#email');
    var inputPesan = qs('#message');
    var penghitung = qs('#counter');
    var infoForm = qs('#formStatus');

    inputPesan.addEventListener('input', function () {
        penghitung.textContent = inputPesan.value.length + ' / ' + inputPesan.maxLength;
    });

    function setError(input, idError, pesan) {
        qs('#' + idError).textContent = pesan;
        input.classList.toggle('invalid', pesan !== '');
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        var nama = inputNama.value.trim();
        var email = inputEmail.value.trim();
        var pesan = inputPesan.value.trim();
        var valid = true;

        // nama wajib diisi
        if (nama === '') {
            setError(inputNama, 'nameError', 'Nama wajib diisi.');
            valid = false;
        } else {
            setError(inputNama, 'nameError', '');
        }

        // email opsional, tapi kalau diisi harus berformat benar
        if (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError(inputEmail, 'emailError', 'Format email belum benar.');
            valid = false;
        } else {
            setError(inputEmail, 'emailError', '');
        }

        // pesan wajib diisi, minimal 10 karakter
        if (pesan.length < 10) {
            setError(inputPesan, 'messageError', 'Pesan minimal 10 karakter.');
            valid = false;
        } else {
            setError(inputPesan, 'messageError', '');
        }

        if (!valid) {
            infoForm.textContent = '';
            return;
        }

        var teks = 'Halo, aku ' + nama + (email ? ' (' + email + ')' : '') + '.\n\n' + pesan;
        window.open('https://wa.me/' + NOMOR_WA + '?text=' + encodeURIComponent(teks), '_blank', 'noopener');

        infoForm.textContent = 'WhatsApp dibuka. Tinggal tekan kirim di sana. Terima kasih sudah menulis.';
        form.reset();
        penghitung.textContent = '0 / ' + inputPesan.maxLength;
    });

    // -----------------------------------------------------
    // 11. Tahun otomatis di footer
    // -----------------------------------------------------
    qs('#year').textContent = new Date().getFullYear();
})();
