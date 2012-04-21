<%
def real(x, i, stride = nil)
	if stride
		"#{x}[2 * (#{stride}) * (#{i})]"
	else
		"#{x}[2 * (#{i})]"
	end
end

def imag(x, i, stride = nil)
	if stride
		"#{x}[2 * (#{stride}) * (#{i}) + 1]"
	else
		"#{x}[2 * (#{i}) + 1]"
	end
end

def load(value, x, i, stride = nil)
	"var #{value}_r = #{real(x, i, stride)}, #{value}_i = #{imag(x, i, stride)}"
end

def store(value, x, i, stride = nil)
	"#{real(x, i, stride)} = #{value}_r, #{imag(x, i, stride)} = #{value}_i"
end

def cadd(result, a, b)
	"var #{result}_r = #{a}_r + #{b}_r, #{result}_i = #{a}_i + #{b}_i"
end

def csub(result, a, b)
	"var #{result}_r = #{a}_r - #{b}_r, #{result}_i = #{a}_i - #{b}_i"
end

def cmul(result, a, b)
	"var #{result}_r = #{a}_r * #{b}_r - #{a}_i * #{b}_i, #{result}_i = #{a}_r * #{b}_i + #{a}_i * #{b}_r"
end
 %>var FFT = function () {
	"use strict"; /* Notice that this semicolon actually is required, I may need this comment to remember that. */
	
	function butterfly2(output, outputOffset, fStride, state, m) {
		var t = state.twiddle
		
		for (var i = 0; i < m; i++) {
			<%= load('s0', 'output', 'outputOffset + i') %>
			<%= load('s1', 'output', 'outputOffset + i + m') %>
			
			<%= load('t1', 't', 'i', 'fStride') %>
			
			<%= cmul('v1', 's1', 't1') %>
			
			<%= cadd('r0', 's0', 'v1') %>
			<%= csub('r1', 's0', 'v1') %>
			
			<%= store('r0', 'output', 'outputOffset + i') %>
			<%= store('r1', 'output', 'outputOffset + i + m') %>
		}
	}
	
	function butterfly3(output, outputOffset, fStride, state, m) {
		var t = state.twiddle
		var m1 = m, m2 = 2 * m
		var fStride1 = fStride, fStride2 = 2 * fStride
		
		var e = <%= imag('t', 'm', 'fStride') %>
		
		for (var i = 0; i < m; i++) {
			<%= load('s0', 'output', 'outputOffset + i') %>
			
			<%= load('s1', 'output', 'outputOffset + i + m1') %>
			<%= load('t1', 't', 'i', 'fStride1') %>
			<%= cmul('v1', 's1', 't1') %>
			
			<%= load('s2', 'output', 'outputOffset + i + m2') %>
			<%= load('t2', 't', 'i', 'fStride2') %>
			<%= cmul('v2', 's2', 't2') %>
			
			<%= cadd('i0', 'v1', 'v2') %>
			
			<%= cadd('r0', 's0', 'i0') %>
			<%= store('r0', 'output', 'outputOffset + i') %>
			
			var i1_r = s0_r - i0_r * 0.5
			var i1_i = s0_i - i0_i * 0.5
			
			var i2_r = (v1_r - v2_r) * e
			var i2_i = (v1_i - v2_i) * e
			
			var r1_r = i1_r - i2_i
			var r1_i = i1_i + i2_r
			<%= store('r1', 'output', 'outputOffset + i + m1') %>
			
			var r2_r = i1_r + i2_i
			var r2_i = i1_i - i2_r
			<%= store('r2', 'output', 'outputOffset + i + m2') %>
		}
	}
	
	function butterfly4(output, outputOffset, fStride, state, m) {
		var t = state.twiddle
		var m1 = m, m2 = 2 * m, m3 = 3 * m
		var fStride1 = fStride, fStride2 = 2 * fStride, fStride3 = 3 * fStride
		
		for (var i = 0; i < m; i++) {
			<%= load('s0', 'output', 'outputOffset + i') %>
			
			<%= load('s1', 'output', 'outputOffset + i + m1') %>
			<%= load('t1', 't', 'i', 'fStride1') %>
			<%= cmul('v1', 's1', 't1') %>
			
			<%= load('s2', 'output', 'outputOffset + i + m2') %>
			<%= load('t2', 't', 'i', 'fStride2') %>
			<%= cmul('v2', 's2', 't2') %>
			
			<%= load('s3', 'output', 'outputOffset + i + m3') %>
			<%= load('t3', 't', 'i', 'fStride3') %>
			<%= cmul('v3', 's3', 't3') %>
			
			<%= cadd('i0', 's0', 'v2') %>
			<%= csub('i1', 's0', 'v2') %>
			<%= cadd('i2', 'v1', 'v3') %>
			<%= csub('i3', 'v1', 'v3') %>
			
			<%= cadd('r0', 'i0', 'i2') %>
			
			if (state.inverse) {
				var r1_r = i1_r - i3_i
				var r1_i = i1_i + i3_r
			} else {
				var r1_r = i1_r + i3_i
				var r1_i = i1_i - i3_r
			}
			
			<%= csub('r2', 'i0', 'i2') %>
			
			if (state.inverse) {
				var r3_r = i1_r + i3_i
				var r3_i = i1_i - i3_r
			} else {
				var r3_r = i1_r - i3_i
				var r3_i = i1_i + i3_r
			}
			
			<%= store('r0', 'output', 'outputOffset + i') %>
			<%= store('r1', 'output', 'outputOffset + i + m1') %>
			<%= store('r2', 'output', 'outputOffset + i + m2') %>
			<%= store('r3', 'output', 'outputOffset + i + m3') %>
		}
	}
	
	function butterfly(output, outputOffset, fStride, state, m, p) {
		var t = state.twiddle, n = state.n, scratch = new Float64Array(2 * p)
		
		for (var u = 0; u < m; u++) {
			for (var q1 = 0, k = u; q1 < p; q1++, k += m) {
				<%= load('x0', 'output', 'outputOffset + k') %>
				<%= store('x0', 'scratch', 'q1') %>
			}
			
			for (var q1 = 0, k = u; q1 < p; q1++, k += m) {
				var tOffset = 0
				
				<%= load('x0', 'scratch', '0') %>
				<%= store('x0', 'output', 'outputOffset + k') %>
				
				for (var q = 1; q < p; q++) {
					tOffset = (tOffset + fStride * k) % n
					
					<%= load('s0', 'output', 'outputOffset + k') %>
					
					<%= load('s1', 'scratch', 'q') %>
					<%= load('t1', 't', 'tOffset') %>
					<%= cmul('v1', 's1', 't1') %>
					
					<%= cadd('r0', 's0', 'v1') %>
					<%= store('r0', 'output', 'outputOffset + k') %>
				}
			}
		}
	}
	
	function work(output, outputOffset, f, fOffset, fStride, inputStride, factors, state) {
		var p = factors.shift()
		var m = factors.shift()
		
		if (m == 1) {
			for (var i = 0; i < p * m; i++) {
				<%= load('x0', 'f', 'fOffset + i * fStride * inputStride') %>
				<%= store('x0', 'output', 'outputOffset + i') %>
			}
		} else {
			for (var i = 0; i < p; i++) {
				work(output, outputOffset + i * m, f, fOffset + i * fStride * inputStride, fStride * p, inputStride, factors.slice(), state)
			}
		}
		
		switch (p) {
			case 2: butterfly2(output, outputOffset, fStride, state, m); break
			case 3: butterfly3(output, outputOffset, fStride, state, m); break
			case 4: butterfly4(output, outputOffset, fStride, state, m); break
			default: butterfly(output, outputOffset, fStride, state, m, p); break
		}
	}
	
	var dft = function (n, inverse) {
		var n = ~~n, inverse = !!inverse
		
		if (n < 1) {
			throw new RangeError("n is outside range, should be positive integer, was `" + n + "'")
		}
		
		var state = {
			n: n,
			inverse: inverse,
			
			factors: [],
			twiddle: new Float64Array(2 * n),
			scratch: new Float64Array(2 * n)
		}
		
		var t = state.twiddle, theta = 2 * Math.PI / n
		
		for (var i = 0; i < n; i++) {
			if (inverse) {
				var phase =  theta * i
			} else {
				var phase = -theta * i
			}
			
			<%= real('t', 'i') %> = Math.cos(phase)
			<%= imag('t', 'i') %> = Math.sin(phase)
		}
		
		var p = 4, v = Math.floor(Math.sqrt(n))
		
		while (n > 1) {
			while (n % p) {
				switch (p) {
					case 4: p = 2; break
					case 2: p = 3; break
					default: p += 2; break
				}
				
				if (p > v) {
					p = n
				}
			}
			
			n /= p
			
			state.factors.push(p)
			state.factors.push(n)
		}
		
		this.state = state
	}
	
	dft.prototype.process = function(output, outputStride, input, inputStride) {
		var outputStride = ~~outputStride, inputStride = ~~inputStride
		
		if (outputStride < 1) {
			throw new RangeError("outputStride is outside range, should be positive integer, was `" + outputStride + "'")
		}
		
		if (inputStride < 1) {
			throw new RangeError("inputStride is outside range, should be positive integer, was `" + inputStride + "'")
		}
		
		if (input == output) {
			work(this.scratch, 0, input, 0, 1, inputStride, this.state.factors.slice(), this.state)
			
			output.set(temp)
		} else {
			work(output, 0, input, 0, 1, inputStride, this.state.factors.slice(), this.state)
		}
	}
	
	return {
		dft: dft
	}
}()
