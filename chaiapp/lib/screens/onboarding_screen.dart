import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:video_player/video_player.dart';
import 'login_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;
  double _scrollOffset = 0.0;

  late VideoPlayerController _videoController1;
  late VideoPlayerController _videoController2;
  late VideoPlayerController _videoController3;
  bool _isVideo1Initialized = false;
  bool _isVideo2Initialized = false;
  bool _isVideo3Initialized = false;

  final List<OnboardingData> _pages = [
    OnboardingData(
      title: 'Fresh chai is\nmade like this',
      subtitle: 'Harvested from lush green estates, selected with utmost care.',
      imagePath: 'assets/videos/video_onboarding1.mp4',
      isVideo: true,
    ),
    OnboardingData(
      title: 'Crafted with passion,\nbrewed to perfection',
      subtitle: 'Watch how we brew the authentic, rich aroma of fresh chai.',
      imagePath: 'assets/videos/video_onboarding2.mp4',
      isVideo: true,
    ),
    OnboardingData(
      title: 'Good chai makes\ngood mood, let\'s\nblend it up.',
      subtitle: 'The finest leaves, the perfect blend, the ultimate refreshment.',
      imagePath: 'assets/videos/video_onboarding3.mp4',
      isVideo: true,
    ),
  ];

  @override
  void initState() {
    super.initState();

    // Initialize Video Player 1
    _videoController1 = VideoPlayerController.asset('assets/videos/video_onboarding1.mp4')
      ..initialize().then((_) {
        setState(() {
          _isVideo1Initialized = true;
        });
        if (_currentPage == 0) {
          _videoController1.play();
          _videoController1.setLooping(true);
          _videoController1.setVolume(0.0);
        }
      });

    // Initialize Video Player 2
    _videoController2 = VideoPlayerController.asset('assets/videos/video_onboarding2.mp4')
      ..initialize().then((_) {
        setState(() {
          _isVideo2Initialized = true;
        });
        _videoController2.setLooping(true);
        _videoController2.setVolume(0.0);
      });

    // Initialize Video Player 3
    _videoController3 = VideoPlayerController.asset('assets/videos/video_onboarding3.mp4')
      ..initialize().then((_) {
        setState(() {
          _isVideo3Initialized = true;
        });
        _videoController3.setLooping(true);
        _videoController3.setVolume(0.0);
      });

    _pageController.addListener(() {
      if (_pageController.hasClients) {
        setState(() {
          _scrollOffset = _pageController.page ?? 0.0;
        });
      }
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    _videoController1.dispose();
    _videoController2.dispose();
    _videoController3.dispose();
    super.dispose();
  }

  void _onPageChanged(int page) {
    setState(() {
      _currentPage = page;
    });

    // Play/Pause videos based on current page
    if (page == 0) {
      if (_isVideo1Initialized) _videoController1.play();
      _videoController2.pause();
      _videoController3.pause();
    } else if (page == 1) {
      _videoController1.pause();
      if (_isVideo2Initialized) _videoController2.play();
      _videoController3.pause();
    } else if (page == 2) {
      _videoController1.pause();
      _videoController2.pause();
      if (_isVideo3Initialized) _videoController3.play();
    }
  }

  void _onNext() {
    if (_currentPage < _pages.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 600),
        curve: Curves.easeInOutCubic,
      );
    } else {
      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => const LoginScreen(),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            const begin = Offset(0.0, 0.1);
            const end = Offset.zero;
            const curve = Curves.easeInOutCubic;
            var tween = Tween(begin: begin, end: end).chain(CurveTween(curve: curve));
            var offsetAnimation = animation.drive(tween);
            var fadeTween = Tween<double>(begin: 0.0, end: 1.0);
            var opacityAnimation = animation.drive(fadeTween);

            return FadeTransition(
              opacity: opacityAnimation,
              child: SlideTransition(
                position: offsetAnimation,
                child: child,
              ),
            );
          },
          transitionDuration: const Duration(milliseconds: 600),
        ),
      );
    }
  }

  void _onSkip() {
    _pageController.animateToPage(
      _pages.length - 1,
      duration: const Duration(milliseconds: 800),
      curve: Curves.easeInOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Background videos cross-fading based on _scrollOffset
          Positioned.fill(
            child: Stack(
              children: [
                // Fallback background
                Container(
                  color: const Color(0xFF2D150B),
                ),

                // Slide 3 video background
                if (_isVideo3Initialized)
                  Opacity(
                    opacity: (_scrollOffset - 1.0).clamp(0.0, 1.0),
                    child: SizedBox.expand(
                      child: FittedBox(
                        fit: BoxFit.cover,
                        child: SizedBox(
                          width: _videoController3.value.size.width,
                          height: _videoController3.value.size.height,
                          child: VideoPlayer(_videoController3),
                        ),
                      ),
                    ),
                  ),

                // Slide 2 video background
                if (_isVideo2Initialized)
                  Opacity(
                    opacity: _scrollOffset <= 1.0
                        ? _scrollOffset.clamp(0.0, 1.0)
                        : (2.0 - _scrollOffset).clamp(0.0, 1.0),
                    child: SizedBox.expand(
                      child: FittedBox(
                        fit: BoxFit.cover,
                        child: SizedBox(
                          width: _videoController2.value.size.width,
                          height: _videoController2.value.size.height,
                          child: VideoPlayer(_videoController2),
                        ),
                      ),
                    ),
                  ),

                // Slide 1 video background
                if (_isVideo1Initialized)
                  Opacity(
                    opacity: (1.0 - _scrollOffset).clamp(0.0, 1.0),
                    child: SizedBox.expand(
                      child: FittedBox(
                        fit: BoxFit.cover,
                        child: SizedBox(
                          width: _videoController1.value.size.width,
                          height: _videoController1.value.size.height,
                          child: VideoPlayer(_videoController1),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // Linear dark chocolate gradient overlay for high video visibility and text readability
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [
                    const Color(0xFF1F0F07).withAlpha(160), // Lighter dark chocolate at bottom
                    const Color(0xFF1F0F07).withAlpha(40),
                    Colors.transparent,
                  ],
                  stops: const [0.0, 0.35, 1.0],
                ),
              ),
            ),
          ),

          // Leaf patterns visible on slide 3 (fade in based on scrollOffset)
          Positioned.fill(
            child: AnimatedBuilder(
              animation: _pageController,
              builder: (context, child) {
                double opacity = 0.0;
                if (_scrollOffset > 1.0) {
                  opacity = (_scrollOffset - 1.0).clamp(0.0, 0.4); // Subtle leaf pattern
                }
                return Opacity(
                  opacity: opacity,
                  child: CustomPaint(
                    painter: LeafBackgroundPainter(scrollOffset: _scrollOffset),
                  ),
                );
              },
            ),
          ),

          SafeArea(
            child: Column(
              children: [
                // Upper navigation bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 8.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      if (_currentPage < _pages.length - 1)
                        GestureDetector(
                          onTap: _onSkip,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.black.withAlpha(50),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              'Skip',
                              style: GoogleFonts.outfit(
                                color: Colors.white.withAlpha(230),
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),

                // Sliding main content
                Expanded(
                  child: PageView.builder(
                    controller: _pageController,
                    onPageChanged: _onPageChanged,
                    itemCount: _pages.length,
                    itemBuilder: (context, index) {
                      final data = _pages[index];

                      // Calculate translation & scaling for transition effect
                      double pageOffset = _scrollOffset - index;
                      double opacity = 1.0 - (pageOffset.abs() * 0.8).clamp(0.0, 1.0);
                      double translationX = pageOffset * 100;

                      return Opacity(
                        opacity: opacity,
                        child: Transform.translate(
                          offset: Offset(translationX, 0),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              const Spacer(), // Video is full-screen background

                              // Title text
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 24.0),
                                child: Text(
                                  data.title,
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.sora(
                                    color: Colors.white,
                                    fontSize: 28,
                                    fontWeight: FontWeight.w700,
                                    height: 1.25,
                                  ),
                                ),
                              ),

                              const SizedBox(height: 12),

                              // Subtitle
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 40.0),
                                child: Text(
                                  data.subtitle,
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.outfit(
                                    color: Colors.white.withAlpha(204),
                                    fontSize: 14,
                                    fontWeight: FontWeight.w400,
                                    height: 1.4,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 32),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),

                // Bottom controls
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 24.0),
                  child: Column(
                    children: [
                      // Dots Indicator
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(_pages.length, (index) {
                          bool isSelected = index == _currentPage;
                          return AnimatedContainer(
                            duration: const Duration(milliseconds: 300),
                            margin: const EdgeInsets.symmetric(horizontal: 4.0),
                            height: 6,
                            width: isSelected ? 20 : 6,
                            decoration: BoxDecoration(
                              color: isSelected ? Colors.white : Colors.white.withAlpha(102),
                              borderRadius: BorderRadius.circular(3),
                            ),
                          );
                        }),
                      ),
                      const SizedBox(height: 28),

                      // Action Button
                      GestureDetector(
                        onTap: _onNext,
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          width: double.infinity,
                          height: 56,
                          decoration: BoxDecoration(
                            color: const Color(0xFF8B6B58), // Light Chocolate
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withAlpha(64),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          alignment: Alignment.center,
                          child: AnimatedSwitcher(
                            duration: const Duration(milliseconds: 200),
                            child: Text(
                              _currentPage == _pages.length - 1 ? 'Get Started' : 'Next',
                              key: ValueKey<int>(_currentPage),
                              style: GoogleFonts.sora(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class OnboardingData {
  final String title;
  final String subtitle;
  final String imagePath;
  final bool isCapsuleImage;
  final bool isVideo;

  OnboardingData({
    required this.title,
    required this.subtitle,
    required this.imagePath,
    this.isCapsuleImage = false,
    this.isVideo = false,
  });
}

// Background painter to render subtle coffee leaves and bean outlines
class LeafBackgroundPainter extends CustomPainter {
  final double scrollOffset;
  LeafBackgroundPainter({required this.scrollOffset});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withAlpha(10)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    // Draw left leaf with parallax movement based on scrollOffset
    double leftX = 40.0 - (scrollOffset * 20);
    double leftY = size.height * 0.25;
    _drawLeaf(canvas, Offset(leftX, leftY), 70, -0.4, paint);

    // Draw right leaf
    double rightX = size.width - 40.0 + (scrollOffset * 20);
    double rightY = size.height * 0.65;
    _drawLeaf(canvas, Offset(rightX, rightY), 90, 0.5, paint);

    // Draw top right bean outline
    double beanX = size.width - 60.0 - (scrollOffset * 10);
    double beanY = size.height * 0.15;
    _drawBean(canvas, Offset(beanX, beanY), 25, 0.2, paint);
  }

  void _drawLeaf(Canvas canvas, Offset center, double scale, double rotation, Paint paint) {
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(rotation);

    final path = Path();
    path.moveTo(0, -scale);
    path.quadraticBezierTo(scale * 0.4, -scale * 0.5, scale * 0.1, 0);
    path.quadraticBezierTo(scale * 0.4, scale * 0.5, 0, scale);
    path.quadraticBezierTo(-scale * 0.4, scale * 0.5, -scale * 0.1, 0);
    path.quadraticBezierTo(-scale * 0.4, -scale * 0.5, 0, -scale);

    // Center vein
    path.moveTo(0, -scale);
    path.lineTo(0, scale);

    canvas.drawPath(path, paint);
    canvas.restore();
  }

  void _drawBean(Canvas canvas, Offset center, double scale, double rotation, Paint paint) {
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(rotation);

    final path = Path();
    path.addOval(Rect.fromCenter(center: Offset.zero, width: scale, height: scale * 1.5));
    // S-curve center line of the bean
    final linePath = Path();
    linePath.moveTo(0, -scale * 0.7);
    linePath.cubicTo(scale * 0.2, -scale * 0.3, -scale * 0.2, scale * 0.3, 0, scale * 0.7);

    canvas.drawPath(path, paint);
    canvas.drawPath(linePath, paint);
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant LeafBackgroundPainter oldDelegate) {
    return oldDelegate.scrollOffset != scrollOffset;
  }
}
