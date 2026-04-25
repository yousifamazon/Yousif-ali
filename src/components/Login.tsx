import React, { useState } from 'react';
import { auth, loginWithGoogle } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, LogIn, UserPlus, Chrome } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsLoading(true);
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      let errorMessage = "هەڵەیەک ڕوویدا";
      if (error.code === 'auth/user-not-found') errorMessage = "ئەم ئیمەیڵە تۆمار نەکراوە";
      else if (error.code === 'auth/wrong-password') errorMessage = "وشەی تێپەڕ هەڵەیە";
      else if (error.code === 'auth/email-already-in-use') errorMessage = "ئەم ئیمەیڵە پێشتر بەکارهێنراوە";
      else if (error.code === 'auth/weak-password') errorMessage = "وشەی تێپەڕ دەبێت لانی کەم ٦ پیت بێت";
      
      alert(errorMessage + ": " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b] p-4 text-white font-['Inter',_sans-serif]" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#161618] rounded-[2.5rem] p-8 border border-gray-800 shadow-2xl relative overflow-hidden"
      >
        {/* Abstract Background element */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl" />

        <div className="relative z-10 text-center mb-8">
          <div className="w-20 h-20 bg-blue-600/20 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
            <LogIn className="w-10 h-10 text-blue-500" />
          </div>
          <h2 className="text-3xl font-black mb-2">
            {isRegister ? "دروستکردنی هەژمار" : "خۆشھاتی بۆ رۆژانەی یوسف"}
          </h2>
          <p className="text-gray-400 font-bold">
            {isRegister ? "ببەوە بە بەشێک لە سیستەمەکەمان" : "تکایە هەژمارەکەت داخڵ بکە بۆ بەردەوامبوون"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4 relative z-10">
          <div className="relative">
            <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="email"
              value={email}
              required
              placeholder="ئیمەیڵ"
              className="w-full p-4 pr-12 rounded-2xl bg-[#222224] border border-gray-700 focus:outline-none focus:border-blue-500 transition-all font-bold text-right"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="relative">
            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="password"
              value={password}
              required
              placeholder="وشەی تێپەڕ"
              className="w-full p-4 pr-12 rounded-2xl bg-[#222224] border border-gray-700 focus:outline-none focus:border-blue-500 transition-all font-bold text-right"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 p-4 rounded-2xl font-black text-lg transition-all active:scale-[0.98] shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
          >
            {isLoading ? (
               <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isRegister ? <><UserPlus className="w-6 h-6" /> تۆمارکردن</> : <><LogIn className="w-6 h-6" /> بچۆ ژوورەوە</>}
              </>
            )}
          </button>
        </form>

        <div className="relative my-8 z-10">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#161618] px-4 text-gray-500 font-bold">یان بەردەوامبە لەگەڵ</span>
          </div>
        </div>

        <button 
          type="button"
          onClick={() => loginWithGoogle()}
          className="w-full bg-white text-black hover:bg-gray-100 p-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all active:scale-[0.98] z-10 relative mb-6 shadow-xl"
        >
          <Chrome className="w-6 h-6" />
          داخڵبوون بە Google
        </button>

        <p 
          className="relative z-10 text-center text-gray-400 font-bold cursor-pointer hover:text-blue-500 transition-colors" 
          onClick={() => setIsRegister(!isRegister)}
        >
          {isRegister ? "هەژمارت هەیە؟ بچۆ ژوورەوە" : "هەژمارت نییە؟ دروستی بکە"}
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
